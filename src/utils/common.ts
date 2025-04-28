import mongoose, { ObjectId } from 'mongoose';

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// Define all expected date formats
const acceptedFormats = [
  'DD/MM/YY',
  'DD-MM-YY',
  'DD/MM/YYYY',
  'DD-MM-YYYY',
  'DD MMM YYYY',
  'DD MMMM YYYY',
  'DD/MMM/YYYY',
  'DD/MMMM/YYYY',
  'DD-MMM-YYYY',
  'DD-MMMM-YYYY',
  'D MMM YYYY',
  'D MMMM YYYY',
  'D-MMM-YY',
  'D/MM/YYYY',
];

class CommonUtils {
  /**
   * Convert a string to a MongoDB ObjectId
   *
   * @param id - The string or ObjectId to convert
   * @returns The converted ObjectId
   */
  convertToObjectId = (id: string | ObjectId | undefined | mongoose.Types.ObjectId) => {
    return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
  };

  parseFlexibleDate = (dateStr: string): string | null => {
    const parsed = dayjs(dateStr.trim(), acceptedFormats, true);
    return parsed.isValid() ? parsed.format('DD/MM/YYYY') : null;
  };
}

const common = new CommonUtils();
export { common };
