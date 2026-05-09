/**
 * PaymentProcessor
 *
 * Handles the actual gateway-specific payment flows:
 *   Razorpay  → load SDK, open popup modal
 *   PhonePe   → redirect to PhonePe hosted page
 *   Airpay    → inject hidden form and auto-submit (form-POST redirect)
 *
 * Props:
 *   gatewayData  — response from POST /api/payments/initiate
 *   orderAmount  — display amount (₹)
 *   storeName    — display store name
 *   userEmail    — pre-fill in Razorpay modal
 *   userPhone    — pre-fill in Razorpay modal
 *   userName     — pre-fill in Razorpay modal
 *   onSuccess(verifyResult) — called after server-side verify succeeds
 *   onFailure(error)        — called if payment fails / is cancelled
 */
import { useEffect, useRef } from 'react';
import api from '../../utils/api';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

function loadScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function submitAirpayForm(action, fields) {
  // Remove any stale form
  const old = document.getElementById('__airpay_form__');
  if (old) old.remove();

  const form = document.createElement('form');
  form.id     = '__airpay_form__';
  form.method = 'POST';
  form.action = action;

  Object.entries(fields).forEach(([k, v]) => {
    const inp  = document.createElement('input');
    inp.type   = 'hidden';
    inp.name   = k;
    inp.value  = v;
    form.appendChild(inp);
  });

  document.body.appendChild(form);
  form.submit();
}

const PaymentProcessor = ({
  gatewayData,
  orderAmount,
  storeName = 'Sattva',
  userEmail = '',
  userPhone = '',
  userName  = '',
  onSuccess,
  onFailure,
}) => {
  const didRun = useRef(false);

  useEffect(() => {
    if (!gatewayData || didRun.current) return;
    didRun.current = true;

    const { gateway, transaction_id } = gatewayData;

    // ── Razorpay ──────────────────────────────────────────────────────────
    if (gateway === 'razorpay') {
      loadScript(RAZORPAY_SCRIPT).then((loaded) => {
        if (!loaded) { onFailure(new Error('Failed to load Razorpay SDK')); return; }

        const options = {
          key:        gatewayData.key_id,
          amount:     gatewayData.amount,
          currency:   gatewayData.currency || 'INR',
          name:       storeName,
          description: 'Order Payment',
          order_id:   gatewayData.razorpay_order_id,
          prefill: { name: userName, email: userEmail, contact: userPhone },
          theme: { color: '#2D6A4F' },
          handler: async (response) => {
            try {
              const res = await api.post('/payments/razorpay/verify', {
                transaction_id,
                razorpay_order_id:  response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              });
              onSuccess(res.data);
            } catch (err) {
              onFailure(err);
            }
          },
          modal: {
            ondismiss: () => onFailure(new Error('Payment cancelled')),
          },
        };

        const rz = new window.Razorpay(options);
        rz.on('payment.failed', (resp) => onFailure(new Error(resp.error.description)));
        rz.open();
      });
      return;
    }

    // ── PhonePe ───────────────────────────────────────────────────────────
    if (gateway === 'phonepe') {
      if (gatewayData.redirect_url) {
        window.location.href = gatewayData.redirect_url;
      } else {
        onFailure(new Error('PhonePe redirect URL missing'));
      }
      return;
    }

    // ── Airpay ────────────────────────────────────────────────────────────
    if (gateway === 'airpay') {
      submitAirpayForm(gatewayData.form_action, gatewayData.form_fields);
      return;
    }

  }, [gatewayData]); // eslint-disable-line react-hooks/exhaustive-deps

  // This component is purely behavioural — renders nothing
  return null;
};

export default PaymentProcessor;
