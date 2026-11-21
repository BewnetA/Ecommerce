import type { MemberProfile, MemberStatus, ServiceCoverage, User } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';
import { getSupabase } from '../supabaseClient';
import { memberStatusToDb, normalizeMemberStatus, normalizeRole } from '../../utils/members';

/**
 * Unified member service: one account, one profile. Replaces the previous
 * separate seller and buyer profile services.
 *
 * Verification decisions (approve / reject / suspend / reinstate) are admin
 * actions. The backend must enforce that only administrators can perform them.
 */

export interface MemberWithDetails {
  user: User;
  profile: MemberProfile;
  listingCount: number;
  activeListingCount: number;
}

export interface MemberProfileUpdate {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  businessName?: string;
  businessDescription?: string;
  email?: string;
  logoUrl?: string;
  city?: string;
  subCity?: string;
  addressDescription?: string;
  latitude?: number | null;
  longitude?: number | null;
  serviceCoverage?: ServiceCoverage;
  currentAddress?: string;
  currentCity?: string;
  currentSubcity?: string;
  currentNotes?: string;
  currentCoordinates?: { latitude: number; longitude: number };
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';

/** Maps a `profiles` row (new or legacy columns) to a member account. */
export function mapSupabaseUser(u: any): User {
  const role = normalizeRole(u.role);
  const verification =
    u.verification_details && typeof u.verification_details === 'object' ? u.verification_details : undefined;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || '+251900000000',
    role,
    status:
      role === 'admin'
        ? String(u.status).toLowerCase() === 'suspended'
          ? 'suspended'
          : 'approved'
        : normalizeMemberStatus(u.verification_status ?? u.status),
    verificationNote: u.verification_note || u.rejection_reason || undefined,
    verification,
    avatarUrl: u.avatar_url || DEFAULT_AVATAR,
    createdAt: u.created_at || new Date().toISOString(),
  };
}

/** Merges a `profiles` row and its business row (`seller_profiles` table). */
function mapSupabaseMemberProfile(p: any, s: any | null): MemberProfile {
  const city = s?.city || p?.city || 'Addis Ababa';
  const subCity = s?.sub_city || p?.sub_city || 'Bole';
  return {
    id: s?.id || p.id,
    userId: p.id,
    businessName: s?.store_name || p.name,
    businessDescription: s?.business_description || '',
    bio: p.bio || undefined,
    phone: s?.phone || p.phone || '',
    email: s?.email || p.email || '',
    city,
    subCity,
    addressDescription: s?.address_description || undefined,
    location: s?.location || `${subCity}, ${city}`,
    latitude: typeof s?.latitude === 'number' ? s.latitude : undefined,
    longitude: typeof s?.longitude === 'number' ? s.longitude : undefined,
    serviceCoverage: s?.service_coverage || undefined,
    logoUrl: s?.logo_url || p.avatar_url || undefined,
    currentAddress: p.address_description || undefined,
    currentCity: p.city || undefined,
    currentSubcity: p.sub_city || undefined,
    currentCoordinates:
      typeof p.latitude === 'number' && typeof p.longitude === 'number'
        ? { latitude: p.latitude, longitude: p.longitude }
        : undefined,
    createdAt: s?.created_at || p.created_at,
    updatedAt: s?.updated_at || p.updated_at || p.created_at,
  };
}

function defaultProfileFor(user: User): MemberProfile {
  return {
    id: user.id,
    userId: user.id,
    businessName: user.name,
    businessDescription: '',
    phone: user.phone,
    email: user.email,
    city: 'Addis Ababa',
    subCity: 'Bole',
    location: 'Bole, Addis Ababa',
    logoUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.createdAt,
  };
}

async function setMemberStatus(
  userId: string,
  status: MemberStatus,
  note: string | undefined,
  notification: { title: string; message: string; type: 'member_approved' | 'member_rejected' | 'member_suspended' | 'member_reinstated'; linkTo: string },
  activity: { action: string; details: string },
  adminUser?: User
): Promise<User> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  if (supabase) {
    const base = { status: memberStatusToDb(status), updated_at: now };
    let { error } = await supabase
      .from('profiles')
      .update({ ...base, verification_note: note ?? null })
      .eq('id', userId);
    if (error) {
      // Current schema has no verification_note column yet.
      ({ error } = await supabase.from('profiles').update(base).eq('id', userId));
    }
    if (error) throw new Error(error.message);

    await supabase.from('notifications').insert({
      id: `notif-${Date.now()}`,
      user_id: userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      is_read: false,
      link_to: notification.linkTo,
      created_at: now,
    });
    await supabase.from('activity_logs').insert({
      id: `act-${Date.now()}`,
      actor_name: adminUser?.name || 'Administrator',
      actor_role: 'admin',
      action: activity.action,
      details: activity.details,
      created_at: now,
    });

    const { data: updated } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!updated) throw new Error('Member not found.');
    return mapSupabaseUser(updated);
  }

  const data = loadStorageData();
  const index = data.users.findIndex((u) => u.id === userId);
  if (index === -1) throw new Error('Member not found.');
  if (data.users[index].role === 'admin') throw new Error('Administrator accounts are not verified as members.');

  data.users[index] = { ...data.users[index], status, verificationNote: note };
  data.notifications.unshift({
    id: `notif-${Date.now()}`,
    userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    isRead: false,
    linkTo: notification.linkTo,
    createdAt: now,
  });
  data.activityLogs.unshift({
    id: `act-${Date.now()}`,
    actorName: adminUser?.name || 'Administrator',
    actorRole: 'admin',
    action: activity.action,
    details: activity.details,
    createdAt: now,
  });
  saveStorageData(data);
  return simulateLatency(data.users[index], 150);
}

export const memberApi = {
  /** The single profile of a member (business details + locations). */
  async getMemberProfile(userId: string): Promise<MemberProfile | null> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: p, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (error || !p) return null;
        const { data: s } = await supabase
          .from('seller_profiles')
          .select('*')
          .or(`user_id.eq.${userId},id.eq.${userId}`)
          .maybeSingle();
        return mapSupabaseMemberProfile(p, s);
      } catch (err) {
        console.error('Supabase getMemberProfile error:', err);
        return null;
      }
    }

    const data = loadStorageData();
    const user = data.users.find((u) => u.id === userId);
    if (!user) return simulateLatency(null, 80);
    const profile = data.memberProfiles.find((m) => m.userId === userId) || defaultProfileFor(user);
    return simulateLatency(profile, 80);
  },

  /** Public member page: account, profile and listing counts. */
  async getMemberWithDetails(userId: string): Promise<MemberWithDetails | null> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (!p) return null;
        const { data: s } = await supabase
          .from('seller_profiles')
          .select('*')
          .or(`user_id.eq.${userId},id.eq.${userId}`)
          .maybeSingle();
        const { data: prods } = await supabase.from('products').select('status').eq('seller_id', userId);
        const listingCount = prods?.length || 0;
        const activeListingCount =
          prods?.filter((x: any) => ['active', 'approved', 'pending'].includes(String(x.status))).length || 0;
        return {
          user: mapSupabaseUser(p),
          profile: mapSupabaseMemberProfile(p, s),
          listingCount,
          activeListingCount,
        };
      } catch (err) {
        console.error('Supabase getMemberWithDetails error:', err);
        return null;
      }
    }

    const data = loadStorageData();
    const user = data.users.find((u) => u.id === userId);
    if (!user) return simulateLatency(null, 80);
    const profile = data.memberProfiles.find((m) => m.userId === userId) || defaultProfileFor(user);
    const listings = data.products.filter((p) => p.sellerId === userId);
    return simulateLatency(
      {
        user,
        profile,
        listingCount: listings.length,
        activeListingCount: listings.filter((p) => p.status === 'active').length,
      },
      100
    );
  },

  /** Members (non-admin accounts), optionally filtered by verification status. */
  async getAllMembers(
    statusFilter?: MemberStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<MemberWithDetails[]> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: rows, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('role', 'admin')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Supabase getAllMembers error:', error);
          return [];
        }
        const members = (rows || [])
          .map((p: any) => ({ row: p, user: mapSupabaseUser(p) }))
          .filter((m) => !statusFilter || m.user.status === statusFilter)
          .slice(offset, offset + limit);

        const { data: businesses } = await supabase.from('seller_profiles').select('*');
        const { data: prods } = await supabase.from('products').select('seller_id, status');
        return members.map(({ row, user }) => {
          const s = (businesses || []).find((b: any) => b.user_id === user.id || b.id === user.id) || null;
          const own = (prods || []).filter((x: any) => x.seller_id === user.id);
          return {
            user,
            profile: mapSupabaseMemberProfile(row, s),
            listingCount: own.length,
            activeListingCount: own.filter((x: any) => ['active', 'approved', 'pending'].includes(String(x.status)))
              .length,
          };
        });
      } catch (err) {
        console.error('Supabase getAllMembers error:', err);
        return [];
      }
    }

    const data = loadStorageData();
    const result = data.users
      .filter((u) => u.role !== 'admin')
      .filter((u) => (statusFilter ? u.status === statusFilter : true))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((user) => {
        const profile = data.memberProfiles.find((m) => m.userId === user.id) || defaultProfileFor(user);
        const listings = data.products.filter((p) => p.sellerId === user.id);
        return {
          user,
          profile,
          listingCount: listings.length,
          activeListingCount: listings.filter((p) => p.status === 'active').length,
        };
      });

    return simulateLatency(result.slice(offset, offset + limit), 150);
  },

  /** Updates the member's own account and profile (never their status). */
  async updateMemberProfile(userId: string, updates: MemberProfileUpdate): Promise<MemberProfile> {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (supabase) {
      const profileUpdates: any = { updated_at: now };
      if (updates.name) profileUpdates.name = updates.name.trim();
      if (updates.phone) profileUpdates.phone = updates.phone.trim();
      if (updates.avatarUrl) profileUpdates.avatar_url = updates.avatarUrl;
      if (updates.currentCity !== undefined) profileUpdates.city = updates.currentCity;
      if (updates.currentSubcity !== undefined) profileUpdates.sub_city = updates.currentSubcity;
      if (updates.currentAddress !== undefined) profileUpdates.address_description = updates.currentAddress;
      if (updates.currentCoordinates) {
        profileUpdates.latitude = updates.currentCoordinates.latitude;
        profileUpdates.longitude = updates.currentCoordinates.longitude;
      }
      const { error: profileError } = await supabase.from('profiles').update(profileUpdates).eq('id', userId);
      if (profileError) throw new Error(profileError.message);

      const businessUpdates: any = { updated_at: now };
      if (updates.businessName) businessUpdates.store_name = updates.businessName.trim();
      if (updates.businessDescription !== undefined) businessUpdates.business_description = updates.businessDescription;
      if (updates.phone) businessUpdates.phone = updates.phone.trim();
      if (updates.email) businessUpdates.email = updates.email.trim();
      if (updates.logoUrl) businessUpdates.logo_url = updates.logoUrl;
      if (updates.city) businessUpdates.city = updates.city;
      if (updates.subCity) businessUpdates.sub_city = updates.subCity;
      if (updates.addressDescription !== undefined) businessUpdates.address_description = updates.addressDescription;
      if (updates.latitude !== undefined) businessUpdates.latitude = updates.latitude;
      if (updates.longitude !== undefined) businessUpdates.longitude = updates.longitude;
      if (updates.serviceCoverage) businessUpdates.service_coverage = updates.serviceCoverage;
      if (updates.city || updates.subCity) {
        businessUpdates.location = `${updates.subCity || ''}, ${updates.city || ''}`.replace(/^, |, $/g, '');
      }

      // Only send the business row when something business-related changed.
      if (Object.keys(businessUpdates).length > 1) {
        const { data: existingBusiness, error: lookupError } = await supabase
          .from('seller_profiles')
          .select('id')
          .or(`user_id.eq.${userId},id.eq.${userId}`)
          .limit(1);
        if (lookupError) throw new Error(lookupError.message);

        if ((existingBusiness || []).length > 0) {
          const { error: businessError } = await supabase
            .from('seller_profiles')
            .update(businessUpdates)
            .or(`user_id.eq.${userId},id.eq.${userId}`);
          if (businessError) throw new Error(businessError.message);
        } else {
          // Older accounts may have no business row yet: create it.
          const { data: owner } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
          const city = updates.city || owner?.city || 'Addis Ababa';
          const subCity = updates.subCity || owner?.sub_city || 'Bole';
          const { error: insertError } = await supabase.from('seller_profiles').insert({
            ...businessUpdates,
            id: `business-${Date.now()}`,
            user_id: userId,
            store_name: businessUpdates.store_name || owner?.name || 'Member',
            business_description: businessUpdates.business_description ?? '',
            phone: businessUpdates.phone || owner?.phone || '',
            email: businessUpdates.email || owner?.email || null,
            city,
            sub_city: subCity,
            location: `${subCity}, ${city}`,
            created_at: now,
          });
          if (insertError) throw new Error(insertError.message);
        }
      }

      const fresh = await memberApi.getMemberProfile(userId);
      if (!fresh) throw new Error('Member not found.');
      return fresh;
    }

    const data = loadStorageData();
    const userIndex = data.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error('Member not found.');
    const user = data.users[userIndex];

    if (updates.name) user.name = updates.name.trim();
    if (updates.phone) user.phone = updates.phone.trim();
    if (updates.avatarUrl) user.avatarUrl = updates.avatarUrl;

    let profileIndex = data.memberProfiles.findIndex((m) => m.userId === userId);
    if (profileIndex === -1) {
      data.memberProfiles.push(defaultProfileFor(user));
      profileIndex = data.memberProfiles.length - 1;
    }
    const current = data.memberProfiles[profileIndex];
    const city = updates.city ?? current.city;
    const subCity = updates.subCity ?? current.subCity;
    const updated: MemberProfile = {
      ...current,
      businessName: updates.businessName?.trim() || current.businessName,
      businessDescription: updates.businessDescription ?? current.businessDescription,
      bio: updates.bio ?? current.bio,
      phone: updates.phone?.trim() || current.phone,
      email: updates.email?.trim() || current.email,
      logoUrl: updates.logoUrl || current.logoUrl,
      city,
      subCity,
      addressDescription: updates.addressDescription ?? current.addressDescription,
      location: `${subCity}, ${city}`,
      latitude: updates.latitude === null ? undefined : updates.latitude ?? current.latitude,
      longitude: updates.longitude === null ? undefined : updates.longitude ?? current.longitude,
      serviceCoverage: updates.serviceCoverage ?? current.serviceCoverage,
      currentAddress: updates.currentAddress ?? current.currentAddress,
      currentCity: updates.currentCity ?? current.currentCity,
      currentSubcity: updates.currentSubcity ?? current.currentSubcity,
      currentNotes: updates.currentNotes ?? current.currentNotes,
      currentCoordinates: updates.currentCoordinates ?? current.currentCoordinates,
      updatedAt: now,
    };
    data.memberProfiles[profileIndex] = updated;

    // Keep the member's existing ads in sync with their public name/phone.
    data.products.forEach((p) => {
      if (p.sellerId === userId) {
        if (updates.businessName) p.sellerName = updated.businessName;
      }
    });

    saveStorageData(data);
    return simulateLatency(updated, 150);
  },

  // -------------------------------------------------------------------------
  // One-time member verification (administrators only)
  // -------------------------------------------------------------------------

  async approveMember(userId: string, adminUser?: User): Promise<User> {
    return setMemberStatus(
      userId,
      'approved',
      undefined,
      {
        title: 'Account Verified!',
        message: 'Your Addis Repair member account is verified. You can now post ads, contact members and manage your listings.',
        type: 'member_approved',
        linkTo: '/account/profile',
      },
      { action: 'APPROVE_MEMBER', details: `Approved member verification (${userId}).` },
      adminUser
    );
  },

  async rejectMember(userId: string, reason: string, adminUser?: User): Promise<User> {
    if (!reason.trim()) throw new Error('A reason for rejection must be provided.');
    return setMemberStatus(
      userId,
      'rejected',
      reason.trim(),
      {
        title: 'Verification Not Approved',
        message: `Your member verification was not approved: ${reason.trim()}`,
        type: 'member_rejected',
        linkTo: '/verification-status',
      },
      { action: 'REJECT_MEMBER', details: `Rejected member verification (${userId}). Reason: ${reason.trim()}` },
      adminUser
    );
  },

  async suspendMember(userId: string, reason: string, adminUser?: User): Promise<User> {
    if (!reason.trim()) throw new Error('A reason for suspension must be provided.');
    return setMemberStatus(
      userId,
      'suspended',
      reason.trim(),
      {
        title: 'Account Suspended',
        message: `Your account has been suspended: ${reason.trim()}`,
        type: 'member_suspended',
        linkTo: '/verification-status',
      },
      { action: 'SUSPEND_MEMBER', details: `Suspended member (${userId}). Reason: ${reason.trim()}` },
      adminUser
    );
  },

  async reinstateMember(userId: string, adminUser?: User): Promise<User> {
    return setMemberStatus(
      userId,
      'approved',
      undefined,
      {
        title: 'Account Reinstated',
        message: 'Your account has been reinstated. Marketplace access is available again.',
        type: 'member_reinstated',
        linkTo: '/account/profile',
      },
      { action: 'REINSTATE_MEMBER', details: `Reinstated member (${userId}).` },
      adminUser
    );
  },
};
