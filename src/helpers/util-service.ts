import { findPhoneNumbersInText, isValidPhoneNumber } from "libphonenumber-js/min";

class UtilServiceBase {
  isValidPhoneNumberSync(phoneText: string) {
    if (!phoneText) return false;
    return isValidPhoneNumber(phoneText);
  }

  findRawPhoneNumbersFromTextSync(phoneText: string) {
    const [numberFound] = findPhoneNumbersInText(phoneText);
    if (!numberFound?.number?.number) return null;
    return numberFound;
  }
}

export const UtilService = new UtilServiceBase();
