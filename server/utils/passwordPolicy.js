const weakList = new Set([
  'password', '123456', '123456789', 'qwerty', 'abc123', '111111', '123123', '12345678', 'qwerty123', '000000',
]);

function validatePasswordStrength(password = '') {
  const errors = [];
  if (typeof password !== 'string') return { valid: false, errors: ['كلمة المرور غير صالحة'] };

  if (password.length < 8) errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  if (!/[a-z]/.test(password)) errors.push('يجب أن تحتوي على حرف صغير واحد على الأقل');
  if (!/[A-Z]/.test(password)) errors.push('يجب أن تحتوي على حرف كبير واحد على الأقل');
  if (!/\d/.test(password)) errors.push('يجب أن تحتوي على رقم واحد على الأقل');
  if (!/[!@#$%^&*()_+\-={}\[\]|;:"'<>.,?/]/.test(password)) errors.push('يجب أن تحتوي على رمز خاص واحد على الأقل');
  if (/\s/.test(password)) errors.push('لا يُسمح بالمسافات في كلمة المرور');
  const lowered = password.toLowerCase();
  if (weakList.has(lowered)) errors.push('كلمة المرور شائعة للغاية، اختر كلمة أقوى');

  return { valid: errors.length === 0, errors };
}

module.exports = { validatePasswordStrength };
