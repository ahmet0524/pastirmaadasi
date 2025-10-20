import Iyzipay from 'iyzipay';
import { Resend } from 'resend';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      errorMessage: 'Method Not Allowed'
    });
  }

  try {
    console.log('🔍 Ödeme doğrulama başlatıldı...');

    const { token, orderData } = req.body;
    if (!token) {
      console.error('⛔ Token bulunamadı');
      return res.status(400).json({
        status: 'error',
        errorMessage: 'Token eksik'
      });
    }

    const iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com'
    });

    // ✅ Iyzico ödeme doğrulaması
    return new Promise((resolve) => {
      iyzipay.checkoutForm.retrieve(
        {
          locale: Iyzipay.LOCALE.TR,
          conversationId: Date.now().toString(),
          token
        },
        async (err, result) => {
          if (err) {
            console.error('❌ Iyzico hata:', err);
            res.status(400).json({
              status: 'error',
              errorMessage: err.errorMessage || 'Doğrulama başarısız'
            });
            resolve();
            return;
          }

          console.log('✅ Iyzico sonucu:', {
            status: result.status,
            paymentStatus: result.paymentStatus,
            paymentId: result.paymentId
          });

          if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
            console.log('💰 Ödeme başarılı, mail gönderimi başlatılıyor...');

            // 🔹 Mail gönderim bloğu
            try {
              const resend = new Resend(process.env.RESEND_API_KEY);

              const customerEmail = orderData?.customerEmail || '';
              const customerName = orderData?.customerName || 'Değerli Müşterimiz';
              const customerPhone = orderData?.customerPhone || '-';
              const customerAddress = orderData?.customerAddress || '-';
              const items = orderData?.items || [];

              const totalPrice = result.paidPrice || orderData?.totalPrice;
              const paymentId = result.paymentId;

              // 📨 HTML mail içeriği
              const emailHtml = `
                <div style="font-family: Arial, sans-serif; color:#333;">
                  <h2>Merhaba ${customerName},</h2>
                  <p>Ödemeniz başarıyla alındı. Siparişiniz hazırlanıyor.</p>
                  <h3>Ödeme Bilgileri</h3>
                  <p><strong>Ödeme ID:</strong> ${paymentId}</p>
                  <p><strong>Tutar:</strong> ${totalPrice}₺</p>
                  <p><strong>Telefon:</strong> ${customerPhone}</p>
                  <p><strong>Adres:</strong> ${customerAddress}</p>
                  <h3>Sipariş İçeriği</h3>
                  <ul>
                    ${items
                      .map(
                        (i) =>
                          `<li>${i.name} (${i.quantity} adet) — ${(i.price * i.quantity).toFixed(2)}₺</li>`
                      )
                      .join('')}
                  </ul>
                  <p style="margin-top:20px;">Teşekkür ederiz 💫<br><strong>Pastırma Adası</strong></p>
                </div>
              `;

              // 🔸 Alıcıya mail
              await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'siparis@pastirmaadasi.com',
                to: customerEmail,
                subject: `Sipariş Onayı - ${paymentId}`,
                html: emailHtml
              });

              // 🔸 Satıcıya bilgilendirme maili
              await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'siparis@pastirmaadasi.com',
                to: process.env.ADMIN_EMAIL || 'successodysseyhub@gmail.com',
                subject: `🧾 Yeni Sipariş - ${customerName}`,
                html: emailHtml
              });

              console.log('✅ E-postalar başarıyla gönderildi.');
            } catch (emailError) {
              console.error('⚠️ E-posta gönderim hatası:', emailError.message);
            }

            // 🟢 Yanıt
            res.status(200).json({
              status: 'success',
              paymentId: result.paymentId,
              paidPrice: result.paidPrice,
              paymentStatus: result.paymentStatus
            });
          } else {
            console.log('❌ Ödeme başarısız:', result.errorMessage);
            res.status(400).json({
              status: 'error',
              errorMessage: result.errorMessage || 'Ödeme başarısız',
              paymentStatus: result.paymentStatus
            });
          }

          resolve();
        }
      );
    });
  } catch (error) {
    console.error('💥 Sunucu hatası:', error);
    return res.status(500).json({
      status: 'error',
      errorMessage: 'Sunucu hatası: ' + error.message
    });
  }
}
