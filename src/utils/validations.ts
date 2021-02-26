export const delay = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

export const hasValue = <T>(obj: unknown): obj is T => {
  return obj !== undefined && obj !== null;
};

const isString = (text: unknown): text is string => {
  return typeof text === "string" || text instanceof String;
};

export const parseString = (label: string, data: unknown): string => {
  if (!data || !isString(data)) {
    throw new Error(`Incorrect or missing string: ${label}`);
  }

  return data;
};

const isEmail = (email: unknown): email is string => {
  const emailPattern = new RegExp(
    /^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i
  );
  return isString(email) && emailPattern.test(email);
};

export const parseEmail = (label: string, data: unknown): string => {
  if (!data || !isEmail(data)) {
    throw new Error(`Incorrect or missing email: ${data}`);
  }

  return data;
};

const isValidVideoType = (type: unknown): type is string => {
  const validVideoTypes = ["mp4", "mkv", "mov", "webm"];

  return isString(type) && validVideoTypes.includes(type);
};

export const parseExtension = (label: string, data: unknown): string => {
  if (!data || !isString(data)) {
    throw new Error(`Incorrect or missing string: ${label}`);
  }

  const type = data.replace(/^.*\./, "");

  if (!data || !isValidVideoType(type)) {
    throw new Error(`Incorrect or missing type of video`);
  }

  return type;
};

const isNumber = (number: unknown): number is number => {
  return typeof number === "number" || number instanceof Number;
};

export const parseNumber = (label: string, data: unknown): number => {
  if (!data || !isNumber(data)) {
    throw new Error(`Incorrect or missing number: ${label}`);
  }

  return data;
};

export const parsePositiveNumber = (
  data: unknown,
  label = "must be positive number"
): number => {
  const number = parseNumber(label, data);

  return number > 0 ? number : 0;
};
