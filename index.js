import { readdir, readFile } from 'fs/promises';
import path from 'path';
import colors from 'colors';


// You can add/remove any extra symbols here.
const JS_SYMBOLS = ['{', '(', '=', '>', '<', '!', '&', '|', '^', '$', '@', '/', '\\', '+', '-', '_', '*'];
// You can add node_modules here if you don't want to include its js files.
const IGNORED_DIRECTORIES = ['build', '.git'];
const BASE_DIR = 'TODO: ADD HERE THE BASE DIRECTORY PATH';
const FILES_PATCH_SIZE = 50;

const remainingDirectories = [BASE_DIR];
const allJsFiles = [];
const lettersCount = {};



// Preparing paths of all js files in the base directory and its sub directories.
const findAllFiles = async () => {
  console.log(colors.magenta('Finding all js files in the directory...'));

  while (remainingDirectories.length > 0) {
    const currentPath = remainingDirectories.pop();
    try {
      // Reading directory entries
      const dir = await readdir(currentPath, { withFileTypes: true });

      // Scanning the read directory entries.
      dir.forEach(dirEntry => {
        if (dirEntry.isDirectory() && !IGNORED_DIRECTORIES.includes(dirEntry.name))
          remainingDirectories.push(path.resolve(currentPath, dirEntry.name));
        else if (dirEntry.isFile() && path.extname(dirEntry.name) === '.js')
          allJsFiles.push(path.resolve(currentPath, dirEntry.name))
      })
    }
    catch (error) {
      // Printing the error and then continue with other paths to investigate the rest of the remaining of the directories.
      console.log(colors.red(error));
    }
  }

}

// Created the process file contents promise which scans the content letter by letter.
const processFileContents = filePath => {
  return new Promise(resolve => {
    console.log(colors.yellow('Processing contents of the file:', filePath));

    readFile(filePath, 'utf8')
      .then(content => {
        Array.from(content)
          .forEach(letter => {
            if (lettersCount[letter] === undefined) lettersCount[letter] = 1;
            else lettersCount[letter] += 1;
          });
        resolve();
      })
      .catch(e => {
        console.log(colors.red('An error occurred processing the file:', filePath, e));
        resolve();
      });
  })
}

// Formats and prints the result.
const printResult = () => {

  // Filtering symbols.
  const filtered = Object.keys(lettersCount)
    .filter(key => JS_SYMBOLS.includes(key))
    .reduce((acc, key) => {
      acc[key] = lettersCount[key];
      return acc;
    }, {});

  // Ordering lettersCount by value.  
  const filteredSorted = Object.entries(filtered)
    .sort(([, v1], [, v2]) => v2 - v1)
    .reduce((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});

  console.log(colors.green(colors.bold(`\r\nFound ${allJsFiles.length} .js files in the directory: ${BASE_DIR}`)));
  console.log(colors.bold(colors.cyan(filteredSorted)));
}

// Processing the files in small patches in order not to consume the whole memory and get blocked by the OS.
const calculateResult = (startIndex = 0) => {
  if (startIndex < allJsFiles.length) {
    const endIndex = startIndex + FILES_PATCH_SIZE
    const currPatchFiles = allJsFiles.slice(startIndex, endIndex);
    Promise.all(currPatchFiles.map(file => processFileContents(file)))
      .then(() => calculateResult(endIndex));
  }
  else {
    printResult();
  }
}


// Executing the script.
await findAllFiles();
calculateResult();
