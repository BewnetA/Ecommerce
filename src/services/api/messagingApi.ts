import type { Conversation, Message, UserRole, LocationSnippet } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';
import { getSupabase } from '../supabaseClient';

export const messagingApi = {
  async getConversations(
    userId: string,
    role: UserRole,
    limit: number = 50,
    offset: number = 0
  ): Promise<Conversation[]> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        let query = supabase.from('conversations').select('*');

        if (role === 'buyer') {
          query = query.eq('buyer_id', userId);
        } else if (role === 'seller') {
          query = query.eq('seller_id', userId);
        }

        const { data, error } = await query
          .order('last_message_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('Supabase getConversations error:', error);
          return [];
        }

        if (data) {
          return data.map((c: any) => ({
            id: c.id,
            buyerId: c.buyer_id,
            buyerName: c.buyer_name,
            sellerId: c.seller_id,
            sellerName: c.seller_name,
            productId: c.product_id,
            productName: c.product_name,
            productImage: c.product_image || '',
            productPrice: Number(c.product_price) || 0,
            lastMessage: c.last_message || '',
            lastMessageAt: c.last_message_at,
            unreadCountBuyer: c.unread_count_buyer || 0,
            unreadCountSeller: c.unread_count_seller || 0,
            createdAt: c.created_at,
          }));
        }
        return [];
      } catch (err) {
        console.error('Supabase getConversations error:', err);
        return [];
      }
    }

    const data = loadStorageData();
    let convs: Conversation[] = [];

    if (role === 'buyer') {
      convs = data.conversations.filter((c) => c.buyerId === userId);
    } else if (role === 'seller') {
      convs = data.conversations.filter((c) => c.sellerId === userId);
    } else {
      convs = [...data.conversations];
    }

    convs.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    return simulateLatency(convs.slice(offset, offset + limit), 100);
  },

  async getConversationWithMessages(
    convId: string,
    userId: string
  ): Promise<{ conversation: Conversation; messages: Message[] }> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: convData, error: convErr } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', convId)
          .maybeSingle();

        if (!convErr && convData) {
          const { data: msgsData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

          const conversation: Conversation = {
            id: convData.id,
            buyerId: convData.buyer_id,
            buyerName: convData.buyer_name,
            sellerId: convData.seller_id,
            sellerName: convData.seller_name,
            productId: convData.product_id,
            productName: convData.product_name,
            productImage: convData.product_image || '',
            productPrice: Number(convData.product_price) || 0,
            lastMessage: convData.last_message || '',
            lastMessageAt: convData.last_message_at,
            unreadCountBuyer: convData.buyer_id === userId ? 0 : (convData.unread_count_buyer || 0),
            unreadCountSeller: convData.seller_id === userId ? 0 : (convData.unread_count_seller || 0),
            createdAt: convData.created_at,
          };

          const messages: Message[] = (msgsData || []).map((m: any) => ({
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderRole: m.sender_role as UserRole,
            content: m.content,
            deliveryLocationSnippet: m.delivery_location_snippet,
            isRead: m.is_read || false,
            createdAt: m.created_at,
          }));

          // Mark unread messages in Supabase
          if (convData.buyer_id === userId) {
            await supabase
              .from('conversations')
              .update({ unread_count_buyer: 0 })
              .eq('id', convId);
          } else if (convData.seller_id === userId) {
            await supabase
              .from('conversations')
              .update({ unread_count_seller: 0 })
              .eq('id', convId);
          }

          return { conversation, messages };
        }
        throw new Error('Conversation not found in Supabase.');
      } catch (err) {
        console.error('Supabase getConversationWithMessages error:', err);
        throw err;
      }
    }

    const data = loadStorageData();
    const conversation = data.conversations.find((c) => c.id === convId);
    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const messages = data.messages
      .filter((m) => m.conversationId === convId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (conversation.buyerId === userId) {
      conversation.unreadCountBuyer = 0;
    } else if (conversation.sellerId === userId) {
      conversation.unreadCountSeller = 0;
    }
    messages.forEach((m) => {
      if (m.senderId !== userId) {
        m.isRead = true;
      }
    });
    saveStorageData(data);

    return simulateLatency({ conversation, messages }, 120);
  },

  async startOrGetConversation(params: {
    buyerId: string;
    buyerName: string;
    sellerId: string;
    productId: string;
    initialMessage?: string;
    locationSnippet?: LocationSnippet;
  }): Promise<{ conversation: Conversation; messages: Message[] }> {
    const { buyerId, buyerName, sellerId, productId, initialMessage, locationSnippet } = params;
    const now = new Date().toISOString();
    const supabase = getSupabase();

    if (supabase) {
      try {
        // Query product and seller from Supabase
        const { data: prodData } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .maybeSingle();

        const { data: sellerData } = await supabase
          .from('seller_profiles')
          .select('*')
          .or(`user_id.eq.${sellerId},id.eq.${sellerId}`)
          .maybeSingle();

        const productName = prodData?.name || 'Product Inquiry';
        const sellerStoreName = sellerData?.store_name || prodData?.seller_name || 'Seller';
        const productImage = (prodData?.images && prodData.images[0]) || '';
        const productPrice = Number(prodData?.price) || 0;

        // Check if existing conversation exists
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('*')
          .eq('buyer_id', buyerId)
          .eq('seller_id', sellerId)
          .eq('product_id', productId)
          .maybeSingle();

        let convId = existingConv?.id;

        if (!existingConv) {
          convId = `conv-${Date.now()}`;
          const newConvPayload = {
            id: convId,
            buyer_id: buyerId,
            buyer_name: buyerName,
            seller_id: sellerId,
            seller_name: sellerStoreName,
            product_id: productId,
            product_name: productName,
            product_image: productImage,
            product_price: productPrice,
            last_message: initialMessage || 'Started conversation',
            last_message_at: now,
            unread_count_buyer: 0,
            unread_count_seller: initialMessage ? 1 : 0,
            created_at: now,
          };

          await supabase
            .from('conversations')
            .insert(newConvPayload);
        }

        if (initialMessage || locationSnippet) {
          const msgId = `msg-${Date.now()}`;
          await supabase.from('messages').insert({
            id: msgId,
            conversation_id: convId,
            sender_id: buyerId,
            sender_name: buyerName,
            sender_role: 'buyer',
            content: initialMessage || (locationSnippet ? 'Shared delivery location' : 'Inquiry started'),
            delivery_location_snippet: locationSnippet || null,
            is_read: false,
            created_at: now,
          });

          // Insert notification in Supabase
          await supabase.from('notifications').insert({
            id: `notif-${Date.now()}`,
            user_id: sellerId,
            title: existingConv ? 'New Customer Message' : 'New Product Inquiry',
            message: `${buyerName} sent a message regarding "${productName}".`,
            type: 'new_message',
            is_read: false,
            link_to: `/seller/messages/${convId}`,
            created_at: now,
          });
        }

        // Return updated conversation and messages
        return this.getConversationWithMessages(convId, buyerId);
      } catch (err) {
        console.warn('Supabase startOrGetConversation error:', err);
      }
    }

    // Local storage fallback
    const data = loadStorageData();
    const product = data.products.find((p) => p.id === productId);
    const seller = data.sellerProfiles.find((s) => s.userId === sellerId || s.id === sellerId);

    if (!product) throw new Error('Product not found.');
    if (!seller) throw new Error('Seller not found.');

    let conversation = data.conversations.find(
      (c) => c.buyerId === buyerId && c.sellerId === sellerId && c.productId === productId
    );

    const isNew = !conversation;

    if (!conversation) {
      conversation = {
        id: `conv-${Date.now()}`,
        buyerId,
        buyerName,
        sellerId,
        sellerName: seller.storeName,
        productId,
        productName: product.name,
        productImage: product.images[0] || '',
        productPrice: product.price,
        lastMessage: initialMessage || 'Started conversation regarding ' + product.name,
        lastMessageAt: now,
        unreadCountBuyer: 0,
        unreadCountSeller: initialMessage ? 1 : 0,
        createdAt: now,
      };
      data.conversations.unshift(conversation);
    }

    if (initialMessage || locationSnippet) {
      const msg: Message = {
        id: `msg-${Date.now()}`,
        conversationId: conversation.id,
        senderId: buyerId,
        senderName: buyerName,
        senderRole: 'buyer',
        content: initialMessage || (locationSnippet ? 'Shared delivery location' : 'Inquiry started'),
        deliveryLocationSnippet: locationSnippet,
        isRead: false,
        createdAt: now,
      };
      data.messages.push(msg);

      conversation.lastMessage = msg.content;
      conversation.lastMessageAt = now;
      conversation.unreadCountSeller += 1;

      data.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: sellerId,
        title: isNew ? 'New Product Inquiry' : 'New Customer Message',
        message: `${buyerName} sent a message regarding "${product.name}".`,
        type: 'new_message',
        isRead: false,
        linkTo: `/seller/messages/${conversation.id}`,
        createdAt: now,
      });
    }

    saveStorageData(data);

    const messages = data.messages
      .filter((m) => m.conversationId === conversation!.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return simulateLatency({ conversation, messages }, 150);
  },

  async sendMessage(params: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    content: string;
    locationSnippet?: LocationSnippet;
  }): Promise<Message> {
    const { conversationId, senderId, senderName, senderRole, content, locationSnippet } = params;
    const now = new Date().toISOString();
    const messageId = `msg-${Date.now()}`;

    const newMessage: Message = {
      id: messageId,
      conversationId,
      senderId,
      senderName,
      senderRole,
      content: content.trim(),
      deliveryLocationSnippet: locationSnippet,
      isRead: false,
      createdAt: now,
    };

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase.from('messages').insert({
          id: messageId,
          conversation_id: conversationId,
          sender_id: senderId,
          sender_name: senderName,
          sender_role: senderRole,
          content: content.trim(),
          delivery_location_snippet: locationSnippet || null,
          is_read: false,
          created_at: now,
        });

        if (error) {
          console.error('Supabase sendMessage error:', error);
        } else {
          // Get conversation to find recipient
          const { data: convData } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .single();

          if (convData) {
            const recipientId = senderRole === 'buyer' ? convData.seller_id : convData.buyer_id;
            await supabase.from('notifications').insert({
              id: `notif-${Date.now()}`,
              user_id: recipientId,
              title: senderRole === 'buyer' ? 'New Message from Buyer' : 'Seller Replied',
              message: `${senderName}: ${newMessage.content.slice(0, 80)}`,
              type: 'new_message',
              is_read: false,
              link_to:
                senderRole === 'buyer'
                  ? `/seller/messages/${conversationId}`
                  : `/buyer/messages/${conversationId}`,
              created_at: now,
            });
          }
          return newMessage;
        }
      } catch (err) {
        console.error('Supabase sendMessage error:', err);
        return newMessage;
      }
    }

    // Update local storage
    const data = loadStorageData();
    const convIndex = data.conversations.findIndex((c) => c.id === conversationId);
    if (convIndex !== -1) {
      const conversation = data.conversations[convIndex];
      data.messages.push(newMessage);
      conversation.lastMessage = content.trim() || (locationSnippet ? 'Shared delivery location' : '');
      conversation.lastMessageAt = now;

      const recipientId = senderRole === 'buyer' ? conversation.sellerId : conversation.buyerId;
      if (senderRole === 'buyer') {
        conversation.unreadCountSeller += 1;
      } else {
        conversation.unreadCountBuyer += 1;
      }

      data.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: recipientId,
        title: senderRole === 'buyer' ? 'New Message from Buyer' : 'Seller Replied',
        message: `${senderName}: ${newMessage.content.slice(0, 80)}`,
        type: 'new_message',
        isRead: false,
        linkTo:
          senderRole === 'buyer'
            ? `/seller/messages/${conversation.id}`
            : `/buyer/messages/${conversation.id}`,
        createdAt: now,
      });

      saveStorageData(data);
    }

    return simulateLatency(newMessage, 100);
  },
};
