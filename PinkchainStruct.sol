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

}
