const solc = require('solc');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'contracts', 'PonscoreJackpot.sol'), 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'PonscoreJackpot.sol': {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    viaIR: true,
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode'],
      },
    },
  },
};

console.log('Compiling PonscoreJackpot.sol with viaIR & optimizer...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const errors = output.errors.filter((e) => e.severity === 'error');
  if (errors.length > 0) {
    console.error('Compilation errors:', errors);
    process.exit(1);
  }
}

const contract = output.contracts['PonscoreJackpot.sol']['PonscoreJackpot'];
console.log('Bytecode size:', contract.evm.bytecode.object.length / 2, 'bytes');

fs.mkdirSync(path.join(__dirname, 'contracts', 'build'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'contracts', 'build', 'PonscoreJackpot.bin'), contract.evm.bytecode.object);
fs.writeFileSync(path.join(__dirname, 'contracts', 'build', 'PonscoreJackpot.json'), JSON.stringify(contract.abi, null, 2));
console.log('SUCCESS! Compiled PonscoreJackpot to contracts/build/');
