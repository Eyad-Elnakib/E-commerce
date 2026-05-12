import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { useToast } from '../components/ToastProvider';
import './CreditCardPage.css';
import { useTelemetry } from '../hooks/useTelemetry';
import { SpidermanError } from '../components/SpidermanError';

export const CreditCardPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { track } = useTelemetry();

  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [highlightClass, setHighlightClass] = useState('hidden');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFocus = (field: string) => {
    if (field === 'cvv') {
      setIsFlipped(true);
      setHighlightClass('highlight__cvv');
    } else {
      setIsFlipped(false);
      if (field === 'number') setHighlightClass('highlight__number');
      if (field === 'holder') setHighlightClass('highlight__holder');
      if (field === 'expire') setHighlightClass('highlight__expire');
    }
  };

  const handleBlur = () => {
    setIsFlipped(false);
    setHighlightClass('hidden');
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardHolder || !expMonth || !expYear || !cvv) {
      setErrorMsg('Please fill in all card details');
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }
    setErrorMsg('');

    // Process the checkout
    const idempotencyKey = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    track('checkout', undefined, { method: 'card' });

    try {
      await ordersApi.createOrder('card', idempotencyKey);
      toast.success({ title: 'Payment Successful', body: 'Order placed successfully using Credit Card!' });
      navigate('/orders');
    } catch (err: any) {
      toast.error({ title: 'Payment Failed', body: err.response?.data?.detail || 'An error occurred during payment' });
    }
  };

  // Render card number spans properly
  const renderCardNumberSpans = () => {
    const spans = [];
    for (let i = 0; i < 16; i++) {
      const hasDigit = i < cardNumber.length;
      let displayChar = '#';
      if (hasDigit) {
        // obfuscate middle digits
        if (i > 3 && i < 12) displayChar = '*';
        else displayChar = cardNumber[i];
      }
      
      spans.push(
        <span key={i} className={hasDigit ? 'filed' : ''}>
          {hasDigit ? displayChar : '#'}<br />{hasDigit ? displayChar : '#'}
        </span>
      );
    }
    return spans;
  };
  return (
    <div className="cc-page-wrapper">
      <main style={{ width: '100%', position: 'relative' }}>
        {errorMsg && <SpidermanError message={errorMsg} />}
        <section className={`cc-card ${isFlipped ? 'flip' : ''}`}>
          <div id="cc-highlight" className={highlightClass}></div>
          
          {/* Front */}
          <section className="cc-card__front">
            <div className="cc-card__header">
              <div>CreditCard</div>
              <svg xmlns="http://www.w3.org/2000/svg" height="40" width="60" viewBox="-96 -98.908 832 593.448">
                <path fill="#ff5f00" d="M224.833 42.298h190.416v311.005H224.833z"/>
                <path fill="#eb001b" d="M244.446 197.828a197.448 197.448 0 0175.54-155.475 197.777 197.777 0 100 311.004 197.448 197.448 0 01-75.54-155.53z"/>
                <path fill="#f79e1b" d="M621.101 320.394v-6.372h2.747v-1.319h-6.537v1.319h2.582v6.373zm12.691 0v-7.69h-1.978l-2.307 5.493-2.308-5.494h-1.977v7.691h1.428v-5.823l2.143 5h1.483l2.143-5v5.823z"/>
                <path fill="#f79e1b" d="M640 197.828a197.777 197.777 0 01-320.015 155.474 197.777 197.777 0 000-311.004A197.777 197.777 0 01640 197.773z"/>
              </svg>
            </div>
            
            <div className="cc-card__number">
              {renderCardNumberSpans()}
            </div>
            
            <div className="cc-card__footer">
              <div className="cc-card__holder">
                <div className="cc-card__section__title">Card Holder</div>
                <div>{cardHolder || 'Name on card'}</div>
              </div>
              <div className="cc-card__expires">
                <div className="cc-card__section__title">Expires</div>
                <span>{expMonth || 'MM'}</span>/<span>{expYear ? expYear.slice(-2) : 'YY'}</span>
              </div>
            </div>
          </section>

          {/* Back */}
          <section className="cc-card__back">
            <div className="cc-card__hide_line"></div>
            <div className="cc-card_cvv">
              <span>CVV</span>
              <div className="cc-card_cvv_field">
                {'*'.repeat(cvv.length)}
              </div>
            </div>
          </section>
        </section>

        <form className="cc-form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="number">Card Number</label>
            <input 
              id="number" 
              type="text" 
              maxLength={16} 
              value={cardNumber}
              onChange={(e) => { setCardNumber(e.target.value.replace(/\D/g, '')); setErrorMsg(''); }}
              onFocus={() => handleFocus('number')}
            />
          </div>
          <div>
            <label htmlFor="holder">Card Holder</label>
            <input 
              id="holder" 
              type="text" 
              value={cardHolder}
              onChange={(e) => { setCardHolder(e.target.value); setErrorMsg(''); }}
              onFocus={() => handleFocus('holder')}
            />
          </div>
          <div className="cc-filed__group">
            <div>
              <label htmlFor="expiration_month">Expiration Date</label>
              <div className="cc-filed__date">
                <select 
                  id="expiration_month"
                  value={expMonth}
                  onChange={(e) => { setExpMonth(e.target.value); setErrorMsg(''); }}
                  onFocus={() => handleFocus('expire')}
                >
                  <option value="" disabled>Month</option>
                  <option value="01">01</option><option value="02">02</option><option value="03">03</option><option value="04">04</option>
                  <option value="05">05</option><option value="06">06</option><option value="07">07</option><option value="08">08</option>
                  <option value="09">09</option><option value="10">10</option><option value="11">11</option><option value="12">12</option>
                </select>
                <select 
                  id="expiration_year"
                  value={expYear}
                  onChange={(e) => { setExpYear(e.target.value); setErrorMsg(''); }}
                  onFocus={() => handleFocus('expire')}
                >
                  <option value="" disabled>Year</option>
                  <option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option><option value="2028">2028</option>
                  <option value="2029">2029</option><option value="2030">2030</option><option value="2031">2031</option><option value="2032">2032</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="cvv">CVV</label>
              <input 
                id="cvv" 
                type="password" 
                maxLength={4} 
                value={cvv}
                onChange={(e) => { setCvv(e.target.value.replace(/\D/g, '')); setErrorMsg(''); }}
                onFocus={() => handleFocus('cvv')}
                onBlur={handleBlur}
              />
            </div>
          </div>
          
          <button 
            type="submit"
            className="w-full mt-4 py-3 bg-[var(--color-brand-maroon)] text-white rounded font-bold hover:bg-[var(--color-brand-maroon-light)] transition-colors"
          >
            Pay Now
          </button>
        </form>
      </main>
    </div>
  );
};
