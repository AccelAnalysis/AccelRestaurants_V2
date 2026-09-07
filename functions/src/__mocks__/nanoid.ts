let counter = 0;

export const nanoid = () => {
  counter += 1;
  return `test-nanoid-${counter}`;
};
