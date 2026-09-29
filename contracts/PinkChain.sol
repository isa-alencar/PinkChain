// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract pinkChain {
    // struct responsável pelos dados do contrato
    struct proofAction {
        bytes32 financeiroHash;
        bytes32 impactoHash;
        address empresaDoadora;
        address ongDestino;
        bool isFinanceiroValido;
        bool isImpactoValido;
        bool seloPinkChain;
    }

// mapas para armazenar valores da tabela hash
mapping(bytes32 => proofAction) public proofs;
mapping(address => bool) public ongWhitelist;

address public admin;

event FinanceiroProof(bytes32 proofActionID, address empresa, bytes32 financeiroHash);
event ImpactoProof(bytes32 proofActionID, address ong, bytes32 impactoHash);
event SeloEmissao(bytes32 proofActionID, address empresa, address ong);

// modificador de acesso
modifier onlyOngWhitelist() {
        require(ongWhitelist[msg.sender], "Instituicao fora da lista de cadastradas aptas.");
        _;
    }

    modifier onlyAdm() {
        require(msg.sender == admin, "Apenas o administrador");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function gerenciarWhitelist(address ong, bool status) external onlyAdm {
            ongWhitelist[ong] = status;
    }

    function submeteFinanceiroProof(bytes32 proofActionID, bytes32 _financeiroHash, address _ong) external {
            require(ongWhitelist[_ong], "ONG destino invalida ou nao aprovada");
            require(proofs[proofActionID].financeiroHash == bytes32(0), "Registro ja existente");

            proofs[proofActionID] = proofAction({
                financeiroHash: _financeiroHash,
                impactoHash: bytes32(0),
                empresaDoadora: msg.sender,
                ongDestino: _ong,
                isFinanceiroValido: true,
                isImpactoValido: false,
                seloPinkChain: false
            });

            emit FinanceiroProof(proofActionID, msg.sender, _financeiroHash);
        }

        function submeteImpactoProofAndVerify(bytes32 proofActionID, bytes32 _impactoHash) external onlyOngWhitelist {
            proofAction storage action = proofs[proofActionID];

                    require(action.isFinanceiroValido, "Input financeiro nao encontrado para este ID.");
                    require(action.ongDestino == msg.sender, "Remetente nao autorizado para esta instituicao.");
                    require(!action.seloPinkChain, "Selo ja emitido para este registro.");

                    action.impactoHash = _impactoHash;
                    action.isImpactoValido = true;

                    // Validação Cruzada Double-Entry Proof
                    if (action.isFinanceiroValido && action.isImpactoValido) {
                        action.seloPinkChain = true;
                        emit SeloEmissao(proofActionID, action.empresaDoadora, action.ongDestino);
                    }

                    emit ImpactoProof(proofActionID, msg.sender, _impactoHash);
            }
}
