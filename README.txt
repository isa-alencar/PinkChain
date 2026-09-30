REMIX PINKCHAIN WORKSPACE

Arquivos configurados no Remix IDE para implementação do projeto PinkChain.

Diretórios contrato-base:
1. 'contracts': contrato PinkChain elaborado conforme o trabalho descrito.
2. 'scripts': typescript para implementar o contrato.
3. 'tests': testes em JS para validar a corretude do contrato.

Diretórios DApp:
1. 'src': arquivos de estilo da aplicação desenvolvida com a IA Remix IDE.


SCRIPTS

The 'scripts' folder has two typescript files which help to deploy the 'Storage' contract using 'ethers.js' libraries.

For the deployment of any other contract, just update the contract name from 'Storage' to the desired contract and provide constructor arguments accordingly 
in the file `deploy_with_ethers.ts`

In the 'tests' folder there is a script containing Mocha-Chai unit tests for 'Storage' contract.

To run a script, right click on file name in the file explorer and click 'Run'. Remember, Solidity file must already be compiled.
Output from script will appear in remix terminal.
