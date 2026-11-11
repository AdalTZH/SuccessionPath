import * as impl from './records-postgres.js';

export const storageDriver = 'postgres';

export const initStore = impl.initStore;
export const listRecords = impl.listRecords;
export const countRecords = impl.countRecords;
export const getRecord = impl.getRecord;
export const createRecord = impl.createRecord;
export const bulkCreateRecords = impl.bulkCreateRecords;
export const upsertRecords = impl.upsertRecords;
export const updateRecord = impl.updateRecord;
export const bulkUpdateRecords = impl.bulkUpdateRecords;
export const updateManyRecords = impl.updateManyRecords;
export const deleteRecord = impl.deleteRecord;
export const deleteManyRecords = impl.deleteManyRecords;
export const aggregateRecords = impl.aggregateRecords;
export const distinctValues = impl.distinctValues;
