export const getFriendlySize = (size: number): string => {
  return size < 1024
    ? `${size}B `
    : size < 1024 ** 2
      ? `${(size / 1024).toFixed(2)}KB`
      : `${(size / 1024 ** 2).toFixed(2)}MB`;
};
