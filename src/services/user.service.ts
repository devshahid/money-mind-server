import { UserLogin } from '../models/user-logins.model';
import { CustomError } from '../core/ApiError';
import jwtHandler from '../core/jwtHandler';
import { User } from '../models/user.model';

class UserService {
  registerService = async (
    email: string,
    password: string,
    fullName: string,
    role: 'ADMIN' | 'USER'
  ) => {
    const isExist = await User.findOne({ email, role });
    if (isExist) throw new CustomError('Email address already registered with us');
    const userData = new User({ email, password, role, fullName });
    const createdUser = await userData.save();

    if (!createdUser) throw new CustomError('Something went wrong while creating user');
    return 'User registered successfully';
  };

  loginService = async (
    email: string,
    password: string,
    role: 'ADMIN' | 'USER',
    accessToken?: string
  ) => {
    const userData = await User.findOne({ email, role });
    if (!userData) throw new CustomError('Email address is not registered with us');

    const isMatched = await userData.comparePassword(password);
    if (!isMatched) throw new CustomError('Invalid Email or Password');

    const token = jwtHandler.createJwtToken({
      email: userData.email,
      userId: userData._id,
      userType: role,
    });

    // Check if accessToken in headers and remove the matching document:
    if (accessToken && accessToken.length > 0) {
      await UserLogin.findOneAndDelete({ accessToken: accessToken });
    }

    const loggedIn = new UserLogin({
      userId: userData._id,
      email: userData.email,
      accessToken: token,
    });
    await loggedIn.save();

    const updatedUser = await User.findById(userData._id, { password: 0 }, { lean: true });
    if (!updatedUser) throw new CustomError('User not exist');
    return { ...updatedUser, accessToken: token };
  };

  logoutService = async (accessToken: string) => {
    const user = await UserLogin.findOne({ accessToken });
    if (!user) throw new CustomError('User not logged in found');

    const updatedUser = await UserLogin.findOneAndDelete(
      { _id: user._id },
      { new: true, lean: true }
    );

    if (!updatedUser) throw new CustomError('Something went wrong while logging not user');
    return updatedUser;
  };
}

export { UserService };
