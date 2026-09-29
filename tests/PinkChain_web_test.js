const{ expect } = require("chai");

describe("PinkChain - Testes de Eventos e Permissões", function () {
  let pinkChain;
  let adminSigner, empresaSigner, ongSigner, naoAdminSigner;
  let admin, empresa, ong, naoAdmin;

  before(async function () {
    const accounts = await web3.eth.getAccounts();
    admin = accounts[0];
    empresa = accounts[1];
    ong = accounts[2];
    naoAdmin = accounts[3];

    // signers definem qual conta executa as funcoes
    const provider = new ethers.providers.Web3Provider(web3.currentProvider);
    adminSigner = provider.getSigner(admin);
    empresaSigner = provider.getSigner(empresa);
    ongSigner = provider.getSigner(ong);
    naoAdminSigner = provider.getSigner(naoAdmin);

    // leitura do .json
    const artifactRaw = await remix.call("fileManager", "getFile", "artifacts/pinkChain.json");
    const artifact = JSON.parse(artifactRaw);

    const abi = artifact.abi;
    const bytecode = artifact.data ? artifact.data.bytecode.object : artifact.bytecode;

    // deploy do contrato
    const factory = new ethers.ContractFactory(abi, bytecode, adminSigner);
    pinkChain = await factory.deploy();
    await pinkChain.deployed();

    await pinkChain.connect(adminSigner).gerenciarWhitelist(ong, true);
  });

  it("Bloqueio de nao-admin na gerencia da whitelist", async function () {
    await expect(
      pinkChain.connect(naoAdminSigner).gerenciarWhitelist(ong, true)
    ).to.be.revertedWith("Apenas o administrador");
  });

  it("Admin administra whitelist", async function () {
    await expect(
        pinkChain.connect(adminSigner).gerenciarWhitelist(ong, true)
    ).to.not.be.revertedWith("Se nao for adm nao pode");
  });

  it("Emissao evento FinanceiroProof com os parametros corretos", async function () {
    const proofActionID = ethers.utils.id("ID_ACAO_01");
    const financeiroHash = ethers.utils.id("HASH_FINANCEIRO_01");

    await expect(
      pinkChain.connect(empresaSigner).submeteFinanceiroProof(proofActionID, financeiroHash, ong)
    )
      .to.emit(pinkChain, "FinanceiroProof")
      .withArgs(proofActionID, empresa, financeiroHash);
  });

  it("Emissao dos eventos ImpactoProof e SeloEmissao para double entry proof", async function () {
    const proofActionID = ethers.utils.id("ID_ACAO_02");
    const financeiroHash = ethers.utils.id("HASH_FINANCEIRO_02");
    const impactoHash = ethers.utils.id("HASH_IMPACTO_02");

    // 1. Submissão financeira da Empresa
    await pinkChain.connect(empresaSigner).submeteFinanceiroProof(proofActionID, financeiroHash, ong);

    // 2. Submissão da ONG e validação dos dois eventos em cadeia
    await expect(
      pinkChain.connect(ongSigner).submeteImpactoProofAndVerify(proofActionID, impactoHash)
    )
      .to.emit(pinkChain, "ImpactoProof")
      .withArgs(proofActionID, ong, impactoHash)
      .and.to.emit(pinkChain, "SeloEmissao")
      .withArgs(proofActionID, empresa, ong);
  });
});