import Iyzipay from 'iyzipay';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      status: 'error',
      errorMessage: 'Method Not Allowed'
    });
  }

  try {
    console.log('Verifying payment...');
    
    const { token, orderData } = req.body;

    if (!token) {
      return res.status(400).json({
        status: 'error',
        errorMessage: 'Token bulunamadı'
      });
    }

    const iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: 'https://sandbox-api.iyzipay.com'
    });

    return new Promise((resolve) => {
      iyzipay.checkoutForm.retrieve({
        locale: Iyzipay.LOCALE.TR,
        conversationId: Date.now().toString(),
        token: token
      }, async (err, result) => {
        if (err) {
          console.error('Iyzico error:', err);
          res.status(400).json({
            status: 'error',
            errorMessage: err.errorMessage || 'Doğrulama başarısız'
          });
          resolve();
        } else {
          console.log('Iyzico result:', result.status, result.paymentStatus);

          if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
            // Ödeme başarılı - Email gönder
            try {
              if (orderData) {
                const emailResponse = await fetch(`${req.headers.origin || 'https://successodysseyhub.com'}/api/send-order-email`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    customerEmail: orderData.customerEmail,
                    customerName: orderData.customerName,
                    customerPhone: orderData.customerPhone,
                    customerAddress: orderData.customerAddress,
                    items: orderData.items,
                    totalPrice: result.paidPrice,
                    paymentId: result.paymentId
                  })
                });

                if (!emailResponse.ok) {
                  console.error('Email sending failed');
                }
              }
            } catch (emailError) {
              console.error('Email error:', emailError);
              // Email hatası ödeme başarısını etkilemez
            }

            res.status(200).json({
              status: 'success',
              paymentId: result.paymentId,
              price: result.price,
              paidPrice: result.paidPrice,
              paymentStatus: result.paymentStatus
            });
          } else {
            res.status(400).json({
              status: 'error',
              errorMessage: result.errorMessage || 'Ödeme başarısız',
              paymentStatus: result.paymentStatus
            });
          }
        }
        resolve();
      });
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      status: 'error',
      errorMessage: 'Sunucu hatası: ' + error.message
    });
  }
}