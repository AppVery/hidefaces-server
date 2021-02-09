export const hasValue = <T>(obj: unknown): obj is T => {
  return obj !== undefined && obj !== null;
};

const isString = (text: unknown): text is string => {
  return typeof text === 'string' || text instanceof String;
};

export const parseString = (label: string, data: unknown): string => {
  if (!data || !isString(data)) {
    throw new Error(`Incorrect or missing string: ${label}`);
  }

  return data;
};

const isEmail = (email: unknown): email is string => {
  const emailPattern = new RegExp(
    /^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i,
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
  const validVideoTypes = ['mp4', 'mkv'];

  return isString(type) && validVideoTypes.includes(type);
};

export const parseExtension = (label: string, data: unknown): string => {
  if (!data || !isString(data)) {
    throw new Error(`Incorrect or missing string: ${label}`);
  }

  const type = data.replace(/^.*\./, '');

  if (!data || !isValidVideoType(type)) {
    throw new Error(`Incorrect or missing type of video`);
  }

  return type;
};
