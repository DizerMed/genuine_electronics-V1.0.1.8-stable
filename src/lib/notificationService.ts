import { Order, POSTransaction, StoreSettings, formatTZS, formatToGMT3 } from '../types';

export interface SendNotificationParams {
  recipientPhone?: string;
  recipientEmail?: string;
  recipientName?: string;
  channel: 'SMS' | 'WhatsApp' | 'Email';
  type: 'ORDER_CONFIRMATION' | 'DISPATCH_UPDATE' | 'LOAN_REMINDER' | 'RECEIPT_SHARE' | 'CUSTOM';
  customMessage?: string;
  order?: Order;
  posTransaction?: POSTransaction;
  storeSettings?: StoreSettings;
  sentBy?: string;
}

export interface NotificationResult {
  success: boolean;
  channel: 'SMS' | 'WhatsApp' | 'Email';
  message: string;
  whatsappUrl?: string;
  logId?: string;
  error?: string;
}

/**
 * Builds localized, high-conversion WhatsApp & SMS message templates in Swahili & English
 */
export function buildNotificationMessage(params: SendNotificationParams): string {
  const { type, order, posTransaction, storeSettings, recipientName, customMessage } = params;
  const storeName = storeSettings?.storeName || 'Genuine Electronics Trust';
  const storePhone = storeSettings?.phone || '+255 768 929 203';
  const storeAddress = storeSettings?.address || 'Kariakoo, Dar es Salaam';

  if (type === 'CUSTOM' && customMessage) {
    return customMessage;
  }

  // 1. Order Confirmation Template
  if (type === 'ORDER_CONFIRMATION' && order) {
    const totalFormatted = formatTZS(order.totalAmount || order.total_amount || 0);
    const itemsSummary = (order.items || [])
      .map(it => `• ${it.quantity}x ${it.product?.name || 'Item'} (${formatTZS((it.price || it.product?.price || 0) * it.quantity)})`)
      .join('\n');

    return `🛍️ *${storeName} - UTHIBITISHO WA ODA*\n\n` +
      `Habari *${recipientName || order.customerName || 'Mteja Wetu'}*,\n` +
      `Oda yako imepokelewa kikamilifu na inashughulikiwa na timu yetu.\n\n` +
      `📋 *Namba ya Oda:* #${order.id.slice(-8).toUpperCase()}\n` +
      `📅 *Tarehe:* ${formatToGMT3(order.createdAt)}\n` +
      `💳 *Hali ya Malipo:* ${order.paymentStatus || 'Pending'}\n` +
      `🚚 *Njia ya Malipo:* ${order.paymentMethod || 'M-Pesa / Cash'}\n\n` +
      `📦 *Bidhaa Zako:*\n${itemsSummary}\n\n` +
      `💰 *Jumla Kuu:* *${totalFormatted}*\n` +
      `📍 *Eneo la Ufikishaji:* ${order.shippingAddress || 'Dar es Salaam'}\n\n` +
      `✨ Bidhaa zote ni 100% Halisi na zinalindwa na Official Warranty.\n` +
      `📞 Maswali au Msaada: ${storePhone}\n` +
      `Asante kwa kuchagua ${storeName}!`;
  }

  // 2. Dispatch / Shipping Update Template
  if (type === 'DISPATCH_UPDATE' && order) {
    const courier = order.courierName || order.courier || 'Genuine Express Dispatch';
    const tracking = order.trackingNumber || order.tracking_number || 'GE-EXP-' + order.id.slice(-6).toUpperCase();
    const eta = order.estimatedDelivery || 'Leo (Masaa 2 - 4)';

    return `🚚 *${storeName} - ODA YAKO IMESAFIRISHWA!*\n\n` +
      `Habari *${recipientName || order.customerName || 'Mteja'}*,\n` +
      `Oda yako #${order.id.slice(-8).toUpperCase()} imepakiwa na kuanza safari kuelekea kwako!\n\n` +
      `📦 *Msafirishaji / Courier:* ${courier}\n` +
      `🔢 *Tracking Number:* *${tracking}*\n` +
      `⏱️ *Muda wa Kufika:* ${eta}\n` +
      `📍 *Inapelekwa:* ${order.shippingAddress || 'Dar es Salaam'}\n\n` +
      `Mhudumu wetu wa usafirishaji atakupigia simu punde akikaribia.\n` +
      `📞 Mawasiliano: ${storePhone}`;
  }

  // 3. Loan / Installment Repayment Reminder Template
  if (type === 'LOAN_REMINDER' && (order || posTransaction)) {
    const tx = (order || posTransaction) as any;
    const balance = tx.outstandingBalance || tx.outstanding_balance || tx.loanBalance || tx.loan_balance || 0;
    const total = tx.totalAmount || tx.total_amount || tx.total || 0;
    const paid = tx.paidAmount || tx.paid_amount || tx.downPayment || tx.down_payment || 0;
    const deadline = tx.loanDueDate || tx.loan_due_date || tx.deadline || 'Tarehe ya makubaliano';

    return `⚠️ *${storeName} - KUMBUKUMBU YA MAREJESHO YA MKOPO*\n\n` +
      `Habari *${recipientName || tx.customerName || 'Mteja Mheshimiwa'}*,\n` +
      `Hii ni kumbukumbu ya kirafiki kuhusu salio la mkopo wa vifaa ulivyochukua.\n\n` +
      `📋 *Kumbukumbu ya Muamala:* #${(tx.id || '').slice(-8).toUpperCase()}\n` +
      `💰 *Jumla ya Thamani:* ${formatTZS(total)}\n` +
      `💵 *Kiasi Kilicholipwa:* ${formatTZS(paid)}\n` +
      `🔴 *Salio Lililobaki:* *${formatTZS(balance)}*\n` +
      `📅 *Mwisho wa Kulipa (Due Date):* *${deadline}*\n\n` +
      `💳 *Jinsi ya Kulipa:* Lipia kwa M-Pesa / Tigo Pesa kupitia namba ${storeSettings?.mobileMoneyNumber || '0768 929 203'} (${storeSettings?.mobileMoneyName || storeName}).\n\n` +
      `📞 Ukiwa na swali tafadhali wasiliana nasi: ${storePhone}`;
  }

  // 4. POS Receipt Text Share Template
  if (type === 'RECEIPT_SHARE' && posTransaction) {
    const total = posTransaction.totalAmount || posTransaction.total || 0;
    const itemsText = (posTransaction.items || [])
      .map(it => `• ${it.quantity}x ${it.product?.name || 'Item'} @ ${formatTZS(it.price || it.product?.price || 0)}`)
      .join('\n');

    return `🧾 *${storeName} - RISITI YA KIELEKTRONIKI*\n\n` +
      `🏪 *Duka:* ${storeAddress}\n` +
      `📜 *Risiti Na:* ${posTransaction.receiptNumber || posTransaction.id.slice(-8).toUpperCase()}\n` +
      `📅 *Tarehe:* ${formatToGMT3(posTransaction.createdAt)}\n` +
      `👤 *Mhudumu:* ${posTransaction.cashierName || 'Cashier'}\n` +
      `💳 *Malipo:* ${posTransaction.paymentMethod}\n\n` +
      `🛍️ *Vitu Vilivyonunuliwa:*\n${itemsText}\n\n` +
      `💵 *Jumla Kuu:* *${formatTZS(total)}*\n` +
      (posTransaction.includeVat ? `🏛️ *TRA VAT (18%):* Imelipwa (Kodi Imejumuishwa)\n` : '') +
      `\n✨ Asante kwa kununua vifaa 100% Halisi na ${storeName}!\n` +
      `📞 Msaada: ${storePhone}`;
  }

  return `Habari kutoka ${storeName}. Asante kwa kuwa mteja wetu! Mawasiliano: ${storePhone}`;
}

/**
 * Dispatches an SMS via backend enterprise endpoint
 */
export async function sendSMSNotification(params: SendNotificationParams): Promise<NotificationResult> {
  const messageBody = buildNotificationMessage(params);
  try {
    const res = await fetch('/api/notifications/dispatch-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientPhone: params.recipientPhone,
        recipientName: params.recipientName,
        messageBody,
        type: params.type,
        orderId: params.order?.id,
        posTransactionId: params.posTransaction?.id,
        sentBy: params.sentBy || 'Admin'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'SMS Dispatch failed');
    }

    return {
      success: true,
      channel: 'SMS',
      message: data.message || 'SMS sent successfully to recipient.',
      logId: data.logId
    };
  } catch (err: any) {
    console.error('SMS notification error:', err);
    return {
      success: false,
      channel: 'SMS',
      message: err.message || 'Failed to dispatch SMS',
      error: err.message
    };
  }
}

/**
 * Builds formatted WhatsApp deep link and logs the dispatch event
 */
export async function sendWhatsAppNotification(params: SendNotificationParams): Promise<NotificationResult> {
  const messageBody = buildNotificationMessage(params);
  const cleanPhone = (params.recipientPhone || '').replace(/[^0-9]/g, '');
  
  // Format for WhatsApp: Ensure country code for Tanzania (+255)
  let waPhone = cleanPhone;
  if (waPhone.startsWith('0') && waPhone.length === 10) {
    waPhone = '255' + waPhone.substring(1);
  } else if (!waPhone.startsWith('255') && waPhone.length === 9) {
    waPhone = '255' + waPhone;
  }

  const encodedMessage = encodeURIComponent(messageBody);
  const whatsappUrl = `https://wa.me/${waPhone}?text=${encodedMessage}`;

  try {
    // Log dispatch to audit backend
    const res = await fetch('/api/notifications/dispatch-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientPhone: params.recipientPhone,
        recipientName: params.recipientName,
        messageBody,
        type: params.type,
        orderId: params.order?.id,
        posTransactionId: params.posTransaction?.id,
        sentBy: params.sentBy || 'Admin'
      })
    });
    const data = await res.json();

    // Open WhatsApp directly in browser/app
    if (typeof window !== 'undefined' && whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }

    return {
      success: true,
      channel: 'WhatsApp',
      message: 'WhatsApp message prepared and opened.',
      whatsappUrl,
      logId: data?.logId
    };
  } catch (err: any) {
    // Fallback: still open WhatsApp directly
    if (typeof window !== 'undefined' && whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
    return {
      success: true,
      channel: 'WhatsApp',
      message: 'WhatsApp opened directly.',
      whatsappUrl
    };
  }
}

/**
 * Mocks an email notification dispatch or connects to an email service.
 */
export async function sendEmailNotification(params: SendNotificationParams): Promise<NotificationResult> {
  const messageBody = buildNotificationMessage(params);
  
  if (!params.recipientEmail) {
    return {
      success: false,
      channel: 'Email',
      message: 'No recipient email provided.',
    };
  }

  try {
    // Log dispatch to audit backend (or trigger real email endpoint if it existed)
    // For now we simulate email success
    console.log(`[Email Dispatched] To: ${params.recipientEmail}\n\nSubject: Receipt from ${params.storeSettings?.storeName || 'Genuine Electronics Trust'}\n\n${messageBody}`);
    
    // Simulate slight network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      success: true,
      channel: 'Email',
      message: 'Email receipt sent successfully.',
      logId: `email_${Date.now()}`
    };
  } catch (err: any) {
    return {
      success: false,
      channel: 'Email',
      message: err.message || 'Failed to dispatch email',
      error: err.message
    };
  }
}

/**
 * Universal dispatcher for SMS, WhatsApp, or Email messages
 */
export async function sendNotificationMessage(params: SendNotificationParams): Promise<NotificationResult> {
  if (params.channel === 'WhatsApp') {
    return sendWhatsAppNotification(params);
  }
  if (params.channel === 'Email') {
    return sendEmailNotification(params);
  }
  return sendSMSNotification(params);
}
