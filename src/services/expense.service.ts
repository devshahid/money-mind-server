import { CustomError } from '@core/ApiError';
import { Category } from '@models/category.model';
import { Expense, ICategoryItems } from '@models/expense.model';
import { common } from '@utils/common';
import { PipelineStage, Types } from 'mongoose';

class ExpenseService {
  createCategoryService = async (
    categoryName: string,
    items: ICategoryItems,
    userId?: Types.ObjectId
  ) => {
    let category = await Category.findOne({ categoryName, userId });
    if (category) throw new CustomError('Category already exists', 400);

    category = new Category({
      categoryName,
      userId,
    });
    const createdCategory = await category.save();
    if (!createdCategory) throw new CustomError('Something went wrong while creating the category');

    const cateogoryItems = new Expense({
      userId,
      categoryId: createdCategory._id,
      itemDetails: { ...items },
    });

    const createdItems = await cateogoryItems.save();
    if (!createdItems) throw new CustomError('Something went wrong while creating the category');

    const fetchedCategory = await Category.findById(createdCategory._id, {}, { lean: true });
    const fetchedItems = await Expense.findById(createdItems._id._id, {}, { lean: true });
    if (!fetchedCategory || !fetchedItems)
      throw new CustomError('Something went wrong while fetching details');

    return { ...fetchedCategory, ...fetchedItems };
  };

  addItemsInCategoryService = async (
    categoryId: string,
    items: ICategoryItems,
    userId?: Types.ObjectId
  ) => {
    const category = await Category.findOne({
      _id: common.convertToObjectId(categoryId),
      userId,
    });

    if (!category) throw new CustomError('Category not found');

    const expense = new Expense({
      userId,
      categoryId,
      itemDetails: { ...items },
    });
    const createdExpense = await expense.save();

    if (!createdExpense)
      throw new CustomError('Something went wrong while adding items to category');

    return 'Item added successfully';
  };

  deleteCategoryService = async (categoryId: string, userId?: Types.ObjectId) => {
    const category = await Category.findOne({
      _id: common.convertToObjectId(categoryId),
      userId,
    });
    if (!category) throw new CustomError('Category not found');
    const deletedCategory = await category.deleteOne();
    if (!deletedCategory) throw new CustomError('Something went wrong while deleting the category');

    await Expense.deleteMany({ categoryId: common.convertToObjectId(categoryId), userId });
    return deletedCategory;
  };

  removeItemsFromCategoryService = async (
    categoryId: string,
    itemId: string,
    userId?: Types.ObjectId
  ) => {
    const category = await Expense.findOne({
      categoryId: common.convertToObjectId(categoryId),
      _id: common.convertToObjectId(itemId),
      userId,
    });
    if (!category) throw new CustomError('Category not found');
    const deletedItem = await category.deleteOne();
    if (!deletedItem) throw new CustomError('Something went wrong while deleting the item');
    return deletedItem;
  };

  updateCategoryService = async (
    categoryId: string,
    categoryName: string,
    userId?: Types.ObjectId
  ) => {
    const category = await Category.findOne({
      _id: common.convertToObjectId(categoryId),
      userId,
    });
    if (!category) throw new CustomError('Category not found');
    category.categoryName = categoryName;
    const updatedCategory = await category.save();
    if (!updatedCategory) throw new CustomError('Something went wrong while updating the category');
    return updatedCategory;
  };

  listAllExpenseService = async (userId?: Types.ObjectId) => {
    const query: PipelineStage[] = [];
    query.push(
      { $match: { userId } }, // Filter by user ID
      {
        $lookup: {
          from: 'categories', // Ensure collection name matches Category model
          localField: 'categoryId',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: '$categoryInfo' }, // Flatten category array
      {
        $group: {
          _id: '$categoryId', // Group by categoryId
          categoryName: { $first: '$categoryInfo.categoryName' }, // Get category name
          items: {
            $push: {
              _id: '$_id', // Add expense document _id
              itemName: '$itemDetails.itemName',
              expectedAmount: '$itemDetails.expectedAmount',
              actualAmount: '$itemDetails.actualAmount',
              isPaid: '$itemDetails.isPaid',
              expenseFixedDate: '$itemDetails.expenseFixedDate',
              paymentDate: '$itemDetails.paymentDate',
              recurring: '$itemDetails.recurring',
            },
          },
        },
      },
      { $project: { categoryId: '$_id', categoryName: 1, items: 1, _id: 0 } }
    );
    const result = await Expense.aggregate(query);
    return result;
  };
}

export { ExpenseService };
