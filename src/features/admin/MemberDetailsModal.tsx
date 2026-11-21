import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Mail,
  Phone,
  BadgeCheck,
  Briefcase,
  IdCard,
  Store,
  MapPin,
  Navigation,
  Package,
  Loader2,
  UserRound,
  Users,
  ExternalLink,
  LayoutGrid,
} from 'lucide-react';
import { memberApi, productApi } from '../../services/api';
import type { MemberWithDetails } from '../../services/api';
import type { Product } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StaticMapPreview } from '../../components/common/MapPointPicker';
import {
  INDUSTRY_ROLE_LABELS,
  ID_TYPE_LABELS,
  MEMBER_STATUS_LABELS,
  CONDITION_LABELS,
  formatETB,
} from '../../utils/members';

const COVERAGE_LABELS: Record<string, string> = {
  atLocation: 'At provider location',
  travelsToCustomer: 'Travels to customer',
  selectedAreas: 'Serves selected areas',
};

type TabKey = 'overview' | 'verification' | 'location' | 'ads';

const formatDate = (value?: string, withTime = false): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

const Field: React.FC<{ label: string; value?: React.ReactNode; mono?: boolean; full?: boolean }> = ({
  label,
  value,
  mono,
  full,
}) => {
  const empty = value === undefined || value === null || value === '';
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd
        className={`mt-1 text-sm break-words ${empty ? 'text-slate-400 italic' : 'text-slate-800'} ${
          mono && !empty ? 'font-mono text-[13px]' : ''
        } ${full ? 'whitespace-pre-line leading-relaxed' : ''}`}
      >
        {empty ? 'Not provided' : value}
      </dd>
    </div>
  );
};

const Section: React.FC<{ icon: React.ElementType; title: string; hint?: string; children: React.ReactNode }> = ({
  icon: Icon,
  title,
  hint,
  children,
}) => (
  <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      </div>
    </div>
    {children}
  </section>
);

const ContactLink: React.FC<{ href: string; icon: React.ElementType; children: React.ReactNode }> = ({
  href,
  icon: Icon,
  children,
}) => (
  <a href={href} className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline">
    <Icon className="h-3.5 w-3.5 shrink-0" />
    {children}
  </a>
);

interface MemberDetailsModalProps {
  /** The member the administrator opened; refreshed from the backend on open. */
  member: MemberWithDetails;
  onClose: () => void;
}

/**
 * Administrator view of everything a member submitted at registration —
 * personal and contact details, repair-industry connection, identity
 * verification and shop / work location — plus their listings.
 * Closes with the X button, a click outside the panel, or Escape.
 */
export const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({ member, onClose }) => {
  const [details, setDetails] = useState<MemberWithDetails>(member);
  const [listings, setListings] = useState<Product[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const memberId = member.user.id;

  // Load the latest member record and all of the member's listings.
  useEffect(() => {
    let cancelled = false;
    Promise.all([memberApi.getMemberWithDetails(memberId), productApi.getMemberProducts(memberId, { limit: 200 })])
      .then(([fresh, items]) => {
        if (cancelled) return;
        if (fresh) setDetails(fresh);
        setListings(items);
      })
      .catch((err) => console.error('Failed to load member details:', err))
      .finally(() => {
        if (!cancelled) setLoadingListings(false);
      });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  // Escape closes the popup; the page behind it does not scroll while open.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const { user, profile, listingCount, activeListingCount } = details;
  const verification = user.verification;
  const shopPoint =
    typeof profile.latitude === 'number' && typeof profile.longitude === 'number'
      ? { latitude: profile.latitude, longitude: profile.longitude }
      : undefined;
  const currentPoint = profile.currentCoordinates;
  const hasCurrentLocation = Boolean(
    currentPoint || profile.currentAddress || profile.currentNotes
  );
  const adsCount = loadingListings ? listingCount : listings.length;
  const noteTone =
    user.status === 'rejected' || user.status === 'suspended'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-amber-200 bg-amber-50 text-amber-800';

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutGrid },
    { key: 'verification', label: 'Verification', icon: BadgeCheck },
    { key: 'location', label: 'Location', icon: MapPin },
    { key: 'ads', label: `Ads (${adsCount})`, icon: Package },
  ];

  const mapsLink = (p: { latitude: number; longitude: number }) =>
    `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-details-title"
        className="relative flex h-[min(88vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
      >
        {/* Header */}
        <div className="relative shrink-0 border-b border-slate-200/80 bg-white px-5 pt-5 sm:px-6">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close member details"
            title="Close"
            className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-start gap-4 pr-10">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-2xl border border-slate-100 object-cover shadow-xs"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <UserRound className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0">
              <h2 id="member-details-title" className="truncate text-lg font-bold text-slate-900">
                {user.name}
              </h2>
              {profile.businessName && profile.businessName !== user.name && (
                <p className="truncate text-sm text-slate-500">{profile.businessName}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={user.status} size="sm" />
                <span className="text-xs text-slate-500">{MEMBER_STATUS_LABELS[user.status]}</span>
                {verification && (
                  <span className="text-xs text-slate-500">
                    · {INDUSTRY_ROLE_LABELS[verification.industryRole] || verification.industryRole}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Total ads', value: listingCount },
              { label: 'Active ads', value: activeListingCount },
              { label: 'Experience', value: verification ? `${verification.yearsOfExperience} yrs` : '—' },
              { label: 'Registered', value: formatDate(user.createdAt) || '—' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
                <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>

          <div role="tablist" aria-label="Member details" className="-mb-px mt-4 flex gap-1 overflow-x-auto">
            {tabs.map(({ key, label, icon: Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(key)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition ${
                    active
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div role="tabpanel" className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {tab === 'overview' && (
            <>
              {user.verificationNote && (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${noteTone}`}>
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">Review team note</p>
                  <p className="mt-1 whitespace-pre-line">{user.verificationNote}</p>
                </div>
              )}

              <Section icon={UserRound} title="Personal & Contact" hint="Submitted at registration">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" value={user.name} />
                  <Field
                    label="Email"
                    value={user.email ? <ContactLink href={`mailto:${user.email}`} icon={Mail}>{user.email}</ContactLink> : undefined}
                  />
                  <Field
                    label="Phone"
                    value={user.phone ? <ContactLink href={`tel:${user.phone}`} icon={Phone}>{user.phone}</ContactLink> : undefined}
                  />
                  <Field label="Registered on" value={formatDate(user.createdAt, true)} />
                </dl>
              </Section>

              <Section icon={Store} title="Business" hint="Shown on the member's ads">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Field label="Shop / business name" value={profile.businessName} />
                  <Field label="Business phone" value={profile.phone} mono />
                  {profile.email && profile.email !== user.email && <Field label="Business email" value={profile.email} />}
                  {profile.serviceCoverage && (
                    <Field label="Service coverage" value={COVERAGE_LABELS[profile.serviceCoverage] || profile.serviceCoverage} />
                  )}
                  <Field label="Business description" value={profile.businessDescription} full />
                  {profile.bio && <Field label="Bio" value={profile.bio} full />}
                </dl>
              </Section>

              <p className="px-1 font-mono text-[11px] text-slate-400">Member ID: {user.id}</p>
            </>
          )}

          {tab === 'verification' &&
            (verification ? (
              <>
                <Section icon={Briefcase} title="Repair-Industry Connection">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Industry role"
                      value={INDUSTRY_ROLE_LABELS[verification.industryRole] || verification.industryRole}
                    />
                    <Field
                      label="Years of experience"
                      value={`${verification.yearsOfExperience} year${verification.yearsOfExperience === 1 ? '' : 's'}`}
                    />
                    <Field label="Workplace / shop" value={verification.workplaceName} />
                    <Field label="Submitted on" value={formatDate(verification.submittedAt, true)} />
                    <Field label="Description of work" value={verification.industryDescription} full />
                  </dl>
                </Section>

                <Section icon={IdCard} title="Identity Verification" hint="Confidential — use only for verification">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Field label="ID type" value={ID_TYPE_LABELS[verification.idType] || verification.idType} />
                    <Field label="ID number" value={verification.idNumber} mono />
                    <Field label="Trade license number" value={verification.tradeLicenseNumber} mono />
                  </dl>
                </Section>

                <Section icon={Users} title="Industry Reference">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Field label="Reference name" value={verification.referenceName} />
                    <Field
                      label="Reference phone"
                      value={
                        verification.referencePhone ? (
                          <ContactLink href={`tel:${verification.referencePhone}`} icon={Phone}>
                            {verification.referencePhone}
                          </ContactLink>
                        ) : undefined
                      }
                    />
                  </dl>
                </Section>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <BadgeCheck className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-700">No verification details on record</p>
                <p className="mt-1 text-xs text-slate-500">
                  The industry role, experience, ID and reference details for this member were not stored.
                </p>
              </div>
            ))}

          {tab === 'location' && (
            <>
              <Section icon={MapPin} title="Shop / Work Location" hint="Default location of the member's ads">
                {shopPoint && (
                  <div className="mb-4 overflow-hidden rounded-xl border border-slate-200">
                    <StaticMapPreview point={shopPoint} className="h-48 w-full" />
                  </div>
                )}
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Field label="City" value={profile.city} />
                  <Field label="Area / neighborhood" value={profile.subCity} />
                  <Field label="Address / landmark" value={profile.addressDescription} full />
                  <Field
                    label="Map coordinates"
                    full
                    value={
                      shopPoint ? (
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-mono text-[13px]">
                            {shopPoint.latitude.toFixed(6)}, {shopPoint.longitude.toFixed(6)}
                          </span>
                          <a
                            href={mapsLink(shopPoint)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                          >
                            Open in Google Maps <ExternalLink className="h-3 w-3" />
                          </a>
                        </span>
                      ) : undefined
                    }
                  />
                </dl>
              </Section>

              {hasCurrentLocation && (
                <Section icon={Navigation} title="Current Location" hint="Used for nearby discovery">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Field label="City" value={profile.currentCity} />
                    <Field label="Area / neighborhood" value={profile.currentSubcity} />
                    <Field label="Address" value={profile.currentAddress} full />
                    {profile.currentNotes && <Field label="Notes" value={profile.currentNotes} full />}
                    <Field
                      label="Coordinates"
                      mono
                      value={
                        currentPoint
                          ? `${currentPoint.latitude.toFixed(6)}, ${currentPoint.longitude.toFixed(6)}`
                          : undefined
                      }
                    />
                  </dl>
                </Section>
              )}
            </>
          )}

          {tab === 'ads' && (
            <Section icon={Package} title="Listings" hint={`${activeListingCount} active of ${listingCount} total`}>
              {loadingListings ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading listings...
                </div>
              ) : listings.length === 0 ? (
                <p className="py-4 text-center text-sm italic text-slate-400">This member has not posted any ads yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {listings.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                          <Briefcase className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {item.listingType}
                          {item.condition ? ` · ${CONDITION_LABELS[item.condition] || item.condition}` : ''}
                          {item.isSoldOut ? ' · Sold out' : ''}
                          {item.createdAt ? ` · ${formatDate(item.createdAt)}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-bold text-slate-900">
                          {item.listingType === 'Posts'
                            ? '—'
                            : formatETB(item.price, { startingPrice: item.isStartingPrice })}
                        </span>
                        <StatusBadge status={item.status} size="sm" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};
