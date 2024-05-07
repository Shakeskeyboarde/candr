import readline from 'node:readline';

export const confirm = async (question: string, defaultValue: boolean = false): Promise<boolean> => {
  if (!process.stdin.isTTY) return defaultValue;

  const i = readline.createInterface(process.stdin, process.stderr);

  return await new Promise<boolean>((resolve) => {
    i.once('SIGINT', () => {
      i.close();
      process.stderr.write('\n');
      resolve(false);
    });

    i.question(`${question} (${defaultValue ? 'Y/n' : 'y/N'}) `, function (answer) {
      i.close();
      answer = answer.trim().toLocaleLowerCase();
      if (!answer) return resolve(defaultValue);
      if (answer === 'y' || answer === 'yes') return resolve(true);
      return resolve(false);
    });
  });
};
