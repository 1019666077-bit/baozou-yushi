declare const saveContract: {
  validSave(save: unknown): boolean;
  revisionConflict(current: unknown, incoming: { revision: number }): boolean;
};

export default saveContract;
