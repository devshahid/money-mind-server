import { Model, Document, PipelineStage } from 'mongoose';

class Pagination {
  add = async <T extends Document>(
    model: Model<T>,
    query: PipelineStage[],
    page = 1,
    limit = 10
  ) => {
    const totalCount = await this.recordCount(model, query);
    query.pop();

    query.push({ $skip: this.offset(page, limit) });
    query.push({ $limit: limit });
    const data = await model.aggregate(query);
    return {
      totalCount: totalCount.length > 0 ? totalCount[0].recordCount : 0,
      result: data,
    };
  };

  private offset = (page: number, limit: number) => {
    if (page == 1 || page == 0) {
      return 0;
    }
    return (page - 1) * limit;
  };

  private recordCount = async <T extends Document>(
    model: Model<T>,
    query: PipelineStage[]
  ): Promise<{ recordCount: number }[]> => {
    query.push({
      $count: 'recordCount',
    });
    return await model.aggregate(query);
  };
}

const pagination = new Pagination();
export { pagination };
