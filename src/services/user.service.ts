import { CustomError } from '../core/ApiError';
import jwtHandler from '../core/jwtHandler';
import { User } from '../models/user.model';

class UserService {
  registerService = async (email: string, password: string, role: 'ADMIN' | 'USER') => {
    const isExist = await User.findOne({ email, role });
    if (isExist) throw new CustomError('Email address already registered with us');

    const userData = new User({ email, password, role });
    await userData.save();

    if (!userData) throw new CustomError('Something went wrong while creating user');
    const token = jwtHandler.createJwtToken({
      email,
      userId: userData._id,
      userType: role,
    });

    const createdUser = await User.findOneAndUpdate(
      { _id: userData._id },
      { $push: { accessToken: token } },
      { new: true, projection: { password: 0 }, lean: true }
    );
    if (!createdUser) throw new CustomError('User not exist');

    return createdUser;
  };

  loginService = async (email: string, password: string, role: 'ADMIN' | 'USER') => {
    const userData = await User.findOne({ email, role });
    if (!userData) throw new CustomError('Email address is not registered with us');

    const isMatched = await userData.comparePassword(password);
    if (!isMatched) throw new CustomError('Invalid Email or Password');

    const token = jwtHandler.createJwtToken({
      email: userData.email,
      userId: userData._id,
      userType: role,
    });

    const updatedUser = await User.findOneAndUpdate(
      { _id: userData._id },
      { $push: { accessToken: token } },
      { new: true, lean: true, projection: { password: 0 } }
    );
    if (!updatedUser) throw new CustomError('User data not updated');

    return updatedUser;
  };

  logoutService = async (accessToken: string) => {
    const user = await User.findOne({ accessToken: { $in: [accessToken] } });
    if (!user) throw new CustomError('User not found');

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      { $pull: { accessToken: accessToken } },
      { new: true, lean: true }
    );

    if (!updatedUser) throw new CustomError('User data not updated');
    return updatedUser;
  };
}

export { UserService };
