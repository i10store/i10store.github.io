/**
 * i10 Store - Simple client-side anti-bot / form protection helpers.
 * Lưu ý: đây là biện pháp bổ trợ, không thay thế cho bảo vệ server-side.
 */
(function(window) {
  const MIN_HUMAN_DELAY_MS = 1000;
  const MAX_FORM_AGE_MS = 10 * 60 * 1000;
  const HONEYPOT_PREFIX = 'i10_hp_';

  function randomToken(length = 24) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  function createHiddenSecurityFields(target, prefix = 'form') {
    if (!target || target.dataset.i10SecurityInit === '1') return null;

    const token = randomToken(24);
    const ts = Date.now().toString();
    const honeypotName = `${HONEYPOT_PREFIX}${randomToken(8)}`;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;';
    wrapper.setAttribute('aria-hidden', 'true');

    const honeypot = document.createElement('input');
    honeypot.type = 'text';
    honeypot.name = honeypotName;
    honeypot.autocomplete = 'off';
    honeypot.tabIndex = -1;
    honeypot.value = '';

    const tokenInput = document.createElement('input');
    tokenInput.type = 'hidden';
    tokenInput.name = 'form_token';
    tokenInput.value = token;

    const tsInput = document.createElement('input');
    tsInput.type = 'hidden';
    tsInput.name = 'form_ts';
    tsInput.value = ts;

    wrapper.appendChild(honeypot);
    wrapper.appendChild(tokenInput);
    wrapper.appendChild(tsInput);
    target.appendChild(wrapper);

    target.dataset.i10SecurityInit = '1';
    target.dataset.i10SecurityHoneypot = honeypotName;
    target.dataset.i10SecurityToken = token;
    target.dataset.i10SecurityTimestamp = ts;

    return {
      honeypotName,
      token,
      timestamp: ts,
      root: target
    };
  }

  function verifySecurityFields(target) {
    if (!target) return false;

    const honeypotName = target.dataset.i10SecurityHoneypot;
    const honeypot = honeypotName ? target.querySelector(`[name="${honeypotName}"]`) : null;
    if (honeypot && honeypot.value.trim() !== '') {
      return false;
    }

    const tokenInput = target.querySelector('[name="form_token"]');
    const tsInput = target.querySelector('[name="form_ts"]');
    if (!tokenInput || !tsInput) return false;

    const ts = parseInt(tsInput.value, 10);
    if (Number.isNaN(ts)) return false;

    const age = Date.now() - ts;
    if (age < MIN_HUMAN_DELAY_MS || age > MAX_FORM_AGE_MS) {
      return false;
    }

    return true;
  }

  function initFormProtection(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    createHiddenSecurityFields(form, formId);
    return true;
  }

  function initButtonProtection(buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) return false;

    button.disabled = true;
    button.dataset.i10SecuritySubmit = '1';
    button.dataset.i10SecurityReady = '0';

    const initialize = () => {
      setTimeout(() => {
        button.disabled = false;
        button.dataset.i10SecurityReady = '1';
      }, 500);
    };

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initialize);
    } else {
      initialize();
    }

    return true;
  }

  function verifyButtonProtection(buttonId) {
    const button = document.getElementById(buttonId);
    return Boolean(button && button.dataset.i10SecurityReady === '1');
  }

  window.I10_SECURITY = window.I10_SECURITY || {};
  window.I10_SECURITY.initFormProtection = initFormProtection;
  window.I10_SECURITY.initButtonProtection = initButtonProtection;
  window.I10_SECURITY.verifySecurityFields = verifySecurityFields;
  window.I10_SECURITY.verifyButtonProtection = verifyButtonProtection;
  window.I10_SECURITY.createHiddenSecurityFields = createHiddenSecurityFields;
}(window));
