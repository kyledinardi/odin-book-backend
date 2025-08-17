const getPaginationOptions = (
  id: string,
): { take: number; cursor?: { id: number }; skip: number } => ({
  take: 20,
  cursor: id ? { id: Number(id) } : undefined,
  skip: id ? 1 : 0,
});

export default getPaginationOptions;
