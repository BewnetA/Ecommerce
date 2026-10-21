import type { Conversation, Message, UserRole, LocationSnippet } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';

export const messagingApi = {
  async getConversations(userId: string, role: UserRole): Promise<Conversation[]> {
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
    return simulateLatency(convs, 100);
  },

  async getConversationWithMessages(
    convId: string,
    userId: string
  ): Promise<{ conversation: Conversation; messages: Message[] }> {
    const data = loadStorageData();
    const conversation = data.conversations.find((c) => c.id === convId);
    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const messages = data.messages
      .filter((m) => m.conversationId === convId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Mark as read for this participant
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
    const data = loadStorageData();
    const { buyerId, buyerName, sellerId, productId, initialMessage, locationSnippet } = params;

    const product = data.products.find((p) => p.id === productId);
    const seller = data.sellerProfiles.find((s) => s.userId === sellerId || s.id === sellerId);

    if (!product) throw new Error('Product not found.');
    if (!seller) throw new Error('Seller not found.');

    // Look for existing conversation between buyer and seller for this product
    let conversation = data.conversations.find(
      (c) => c.buyerId === buyerId && c.sellerId === sellerId && c.productId === productId
    );

    const isNew = !conversation;
    const now = new Date().toISOString();

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

      // Notify seller
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
    const data = loadStorageData();
    const { conversationId, senderId, senderName, senderRole, content, locationSnippet } = params;

    const convIndex = data.conversations.findIndex((c) => c.id === conversationId);
    if (convIndex === -1) {
      throw new Error('Conversation not found.');
    }

    const conversation = data.conversations[convIndex];
    const now = new Date().toISOString();

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId,
      senderName,
      senderRole,
      content: content.trim(),
      deliveryLocationSnippet: locationSnippet,
      isRead: false,
      createdAt: now,
    };

    data.messages.push(newMessage);

    conversation.lastMessage = content.trim() || (locationSnippet ? 'Shared delivery location' : '');
    conversation.lastMessageAt = now;

    // Determine recipient
    const recipientId = senderRole === 'buyer' ? conversation.sellerId : conversation.buyerId;
    if (senderRole === 'buyer') {
      conversation.unreadCountSeller += 1;
    } else {
      conversation.unreadCountBuyer += 1;
    }

    // Create notification for recipient
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: recipientId,
      title: senderRole === 'buyer' ? 'New Message from Buyer' : 'Seller Replied',
      message: `${senderName}: ${newMessage.content.slice(0, 80)}${newMessage.content.length > 80 ? '...' : ''}`,
      type: 'new_message',
      isRead: false,
      linkTo:
        senderRole === 'buyer'
          ? `/seller/messages/${conversation.id}`
          : `/buyer/messages/${conversation.id}`,
      createdAt: now,
    });

    saveStorageData(data);
    return simulateLatency(newMessage, 100);
  },
};
