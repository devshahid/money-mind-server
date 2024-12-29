import mongoose, { ObjectId } from 'mongoose';

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
}

const common = new CommonUtils();
export { common };
