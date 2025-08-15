const getPaginationOptions = (id: string) => {
  return {
    take: 20,
    cursor: id ? { id: Number(id) } : undefined,
    skip: id ? 1 : 0,
  };
};

export default getPaginationOptions;
