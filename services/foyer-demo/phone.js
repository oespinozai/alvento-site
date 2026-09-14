"use strict";

function incompleteMobileReply(message) {
  // Validate explicit mobile-number candidates, not arbitrary numbers such as dates.
  const numbers = message.match(/(?:\b07|\+44[ -]?7)[\d -]{4,16}\d\b/g) || [];
  for (const number of numbers) {
    const digits = number.replace(/\D/g, "");
    const expected = number.startsWith("+") ? 12 : 11;
    if (digits.length !== expected) {
      return "That mobile number looks incomplete or has an extra digit. Could you repeat the full number, please?";
    }
  }
  return null;
}

module.exports = { incompleteMobileReply };
