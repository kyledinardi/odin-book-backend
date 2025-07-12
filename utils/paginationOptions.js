function getPaginationOptions(id) {
  return {
    take: 20,
    cursor: id ? { id: Number(id) } : undefined,
    skip: id ? 1 : 0,
  };
}

module.exports = getPaginationOptions;
