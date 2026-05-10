/**
 * RazorpayCheckout
 *
 * Headless component — loads the Razorpay SDK script, opens the modal,
 * calls /api/payments/razorpay/verify on success, then fires onSuccess/onError.
 *
 * Renders nothing — mount it when you're ready to show the modal.
 *
 * Props:
 *   paymentData   — response from POST /api/payments/initiate
 *   user          — { name, email, phone }
 *   onSuccess(result) — called with verify API response on success
 *   onCancel()        — called when user dismisses the modal
 *   onError(err)      — called on payment failure or network error
 */
import { useEffect, useRef } from 'react';
import api from '../../utils/api';

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      resolve(true);
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const RazorpayCheckout = ({ paymentData, user, onSuccess, onCancel, onError }) => {
  const opened = useRef(false);

  useEffect(() => {
    if (!paymentData || opened.current) return;
    opened.current = true;

    const { transaction_id, razorpay_order_id, key_id, amount, currency } = paymentData;

    loadRazorpayScript().then((loaded) => {
      if (!loaded) {
        onError(new Error('Failed to load Razorpay SDK. Check your internet connection.'));
        return;
      }

      const options = {
        key:         key_id,
        amount:      amount,
        currency:    currency || 'INR',
        name:        'Sattva Wellness',
        description: 'Order Payment',
        image:       '/logo192.png',
        order_id:    razorpay_order_id,
        prefill: {
          name:    user?.name    || '',
          email:   user?.email   || '',
          contact: user?.phone   || '',
        },
        theme: { color: '#2D6A4F' },

        handler: async (response) => {
          // Payment captured by Razorpay — now verify server-side
          try {
            const res = await api.post('/payments/razorpay/verify', {
              transaction_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });
            onSuccess(res.data);
          } catch (err) {
            onError(err);
          }
        },

        modal: {
          ondismiss: () => {
            onCancel();
          },
          escape: true,
          animation: true,
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (resp) => {
        onError(new Error(resp.error?.description || 'Payment failed'));
      });

      rzp.open();
    });
  }, [paymentData]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

export default RazorpayCheckout;
