import  './index.css'
import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [adminAddr, setAdminAddr] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState('whitelist');
  const [txStatus, setTxStatus] = useState(null);

  // Whitelist state
  const [wlAddress, setWlAddress] = useState('');
  const [wlStatus, setWlStatus] = useState(true);
  const [wlCheckResult, setWlCheckResult] = useState(null);

  // Financeiro state
  const [finActionId, setFinActionId] = useState('');
  const [finHash, setFinHash] = useState('');
  const [finOng, setFinOng] = useState('');
  const [finResult, setFinResult] = useState(null);

  // Impacto state
  const [impActionId, setImpActionId] = useState('');
  const [impHash, setImpHash] = useState('');
  const [impResult, setImpResult] = useState(null);

  // Proof lookup
  const [proofLookupId, setProofLookupId] = useState('');
  const [proofData, setProofData] = useState(null);
  const [proofLoading, setProofLoading] = useState(false);

  const getContractFromConfig = useCallback(() => {
    const config = window.__QUICK_DAPP_CONFIG__;
    if (!config || !config.contracts || config.contracts.length === 0) return null;
    const primaryId = config.primaryContractId;
    if (primaryId) {
      const found = config.contracts.find((c) => c.id === primaryId);
      if (found) return found;
    }
    return config.contracts[0];
  }, []);

  const ADMIN_PADRAO = '0x2b259452a7cb31b5eecdebd63c22a661887bbc64';

  const connectWallet = async () => {
    setConnecting(true);
    setTxStatus(null);
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      await p.send('eth_requestAccounts', []);
      const s = await p.getSigner();
      const addr = await s.getAddress();
      const binding = getContractFromConfig();
      if (!binding) {
        setTxStatus({ type: 'error', msg: 'No contract configuration found.' });
        setConnecting(false);
        return;
      }
      const c = new ethers.Contract(binding.address, binding.abi, s);

      // Fetch admin
      let admin = '';
    try {
      admin = await c.admin();
    } catch (_) {
      try {
        admin = await c.owner();
      } catch (_) {}
    }

    // Case with no return
    if (!admin) {
      admin = ADMIN_PADRAO;
    }

      setProvider(p);
      setSigner(s);
      setAccount(addr);
      setContract(c);
      setAdminAddr(admin);
      setIsConnected(true);
    } catch (err) {
      setTxStatus({ type: 'error', msg: err.message || 'Failed to connect.' });
    }
    setConnecting(false);
  };

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setIsConnected(false);
        setAccount('');
        setSigner(null);
        setContract(null);
        return;
      }
      const newAddr = accounts[0];
      if (newAddr !== account) {
        const p = new ethers.BrowserProvider(window.ethereum);
        const s = await p.getSigner();
        const binding = getContractFromConfig();
        if (binding) {
          const c = new ethers.Contract(binding.address, binding.abi, s);
          setContract(c);
          let admin = '';
          try {
            admin = await c.admin();
          } catch (_) {}
          setAdminAddr(admin);
        }
        setSigner(s);
        setAccount(newAddr);
      }
    };
    window.ethereum.on?.('accountsChanged', handleAccountsChanged);
    return () => {
      window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
    };
  }, [account, getContractFromConfig]);

  const shortAddr = (a) => {
    if (!a) return '';
    return a.slice(0, 6) + '...' + a.slice(-4);
  };

  const isAdmin = () => {
    if (!adminAddr || !account) return false;
    return adminAddr.toLowerCase() === account.toLowerCase();
  };

  const handleWhitelist = async () => {
    if (!contract) return;
    if (!wlAddress || !ethers.isAddress(wlAddress)) {
      setTxStatus({ type: 'error', msg: 'Please enter a valid Ethereum address.' });
      return;
    }
    setTxStatus({ type: 'info', msg: 'Sending transaction...' });
    try {
      const tx = await contract.gerenciarWhitelist(wlAddress, wlStatus);
      setTxStatus({ type: 'info', msg: 'Transaction sent. Waiting for confirmation...' });
      await tx.wait();
      setTxStatus({
        type: 'success',
        msg: `ONG ${wlStatus ? 'added to' : 'removed from'} whitelist successfully.`,
        hash: tx.hash,
      });
      setWlAddress('');
      setWlCheckResult(null);
    } catch (err) {
      setTxStatus({ type: 'error', msg: err.reason || err.message || 'Transaction failed.' });
    }
  };

  const checkWhitelist = async () => {
    if (!contract) return;
    if (!wlAddress || !ethers.isAddress(wlAddress)) {
      setTxStatus({ type: 'error', msg: 'Please enter a valid Ethereum address to check.' });
      return;
    }
    setTxStatus(null);
    try {
      const result = await contract.ongWhitelist(wlAddress);
      setWlCheckResult(result);
    } catch (err) {
      setTxStatus({ type: 'error', msg: err.reason || err.message || 'Lookup failed.' });
    }
  };

  const handleFinanceiro = async () => {
    if (!contract) return;
    if (!finActionId || !finHash || !finOng) {
      setTxStatus({ type: 'error', msg: 'All fields are required for financial proof submission.' });
      return;
    }
    try {
      ethers.getBytes(finActionId);
      ethers.getBytes(finHash);
    } catch (_) {
      setTxStatus({ type: 'error', msg: 'proofActionID and financeiroHash must be valid 32-byte hex values (0x...).' });
      return;
    }
    if (!ethers.isAddress(finOng)) {
      setTxStatus({ type: 'error', msg: 'ONG address must be a valid Ethereum address.' });
      return;
    }
    setTxStatus({ type: 'info', msg: 'Submitting financial proof...' });
    setFinResult(null);
    try {
      const tx = await contract.submeteFinanceiroProof(finActionId, finHash, finOng);
      setTxStatus({ type: 'info', msg: 'Transaction sent. Waiting for confirmation...' });
      await tx.wait();
      setTxStatus({
        type: 'success',
        msg: 'Financial proof submitted successfully.',
        hash: tx.hash,
      });
      // Lookup the proof
      try {
        const proof = await contract.proofs(finActionId);
        setFinResult({
          financeiroHash: proof.financeiroHash,
          empresaDoadora: proof.empresaDoadora,
          ongDestino: proof.ongDestino,
          isFinanceiroValido: proof.isFinanceiroValido,
          seloPinkChain: proof.seloPinkChain,
        });
      } catch (_) {}
    } catch (err) {
      setTxStatus({ type: 'error', msg: err.reason || err.message || 'Transaction failed.' });
    }
  };

  const handleImpacto = async () => {
    if (!contract) return;
    if (!impActionId || !impHash) {
      setTxStatus({ type: 'error', msg: 'All fields are required for impact proof submission.' });
      return;
    }
    try {
      ethers.getBytes(impActionId);
      ethers.getBytes(impHash);
    } catch (_) {
      setTxStatus({ type: 'error', msg: 'proofActionID and impactoHash must be valid 32-byte hex values (0x...).' });
      return;
    }
    setTxStatus({ type: 'info', msg: 'Submitting impact proof...' });
    setImpResult(null);
    try {
      const tx = await contract.submeteImpactoProofAndVerify(impActionId, impHash);
      setTxStatus({ type: 'info', msg: 'Transaction sent. Waiting for confirmation...' });
      await tx.wait();
      setTxStatus({
        type: 'success',
        msg: 'Impact proof submitted successfully.',
        hash: tx.hash,
      });
      // Lookup the proof
      try {
        const proof = await contract.proofs(impActionId);
        setImpResult({
          impactoHash: proof.impactoHash,
          ongDestino: proof.ongDestino,
          isImpactoValido: proof.isImpactoValido,
          seloPinkChain: proof.seloPinkChain,
        });
      } catch (_) {}
    } catch (err) {
      setTxStatus({ type: 'error', msg: err.reason || err.message || 'Transaction failed.' });
    }
  };

  const lookupProof = async () => {
    if (!contract) return;
    if (!proofLookupId) {
      setTxStatus({ type: 'error', msg: 'Enter a proofActionID to look up.' });
      return;
    }
    try {
      ethers.getBytes(proofLookupId);
    } catch (_) {
      setTxStatus({ type: 'error', msg: 'proofActionID must be a valid 32-byte hex value (0x...).' });
      return;
    }
    setProofLoading(true);
    setTxStatus(null);
    try {
      const proof = await contract.proofs(proofLookupId);
      setProofData(proof);
    } catch (err) {
      setTxStatus({ type: 'error', msg: err.reason || err.message || 'Lookup failed.' });
    }
    setProofLoading(false);
  };

  const formatBytes32 = (val) => {
    if (!val) return '—';
    const s = String(val);
    return s.length > 20 ? s.slice(0, 10) + '...' + s.slice(-8) : s;
  };

  const config = window.__QUICK_DAPP_CONFIG__ || {};
  const title = config.title || 'PinkChain';

  // Config error state
  if (!config.contracts || config.contracts.length === 0) {
    return (
      <div className="app-shell">
        <div className="config-error">
          <h2>Configuration Error</h2>
          <p>No contract configuration found. Please ensure the DApp is properly deployed with a valid contract binding.</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="app-shell">
        <header className="header">
          <div className="brand">
            <div className="brand-mark">P</div>
            <div className="brand-text">
              <h1>{title}</h1>
              <p>{config.subtitle || ''}</p>
            </div>
          </div>
        </header>
        <div className="disconnected">
          <div className="disconnected-icon">🔗</div>
          <p className="disconnected-text">Connect your wallet to access the PinkChain admin and proof submission interface.</p>
          <button className="btn btn-connect" onClick={connectWallet} disabled={connecting}>
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
          {txStatus && (
            <div className={`status-box status-${txStatus.type}`}>
              <span className="status-icon">{txStatus.type === 'error' ? '⚠' : 'ℹ'}</span>
              <span>{txStatus.msg}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div className="brand-text">
            <h1>{title}</h1>
            <p>{config.subtitle || ''}</p>
          </div>
        </div>
        <button className={`wallet-pill connected`} onClick={connectWallet} title={account}>
          <span className="dot"></span>
          {shortAddr(account)}
        </button>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'whitelist' ? 'active' : ''}`}
          onClick={() => { setActiveTab('whitelist'); setTxStatus(null); }}
        >
          Painel do Administrador
        </button>
        <button
          className={`tab ${activeTab === 'financeiro' ? 'active' : ''}`}
          onClick={() => { setActiveTab('financeiro'); setTxStatus(null); }}
        >
          Prova do Financiamento
        </button>
        <button
          className={`tab ${activeTab === 'impacto' ? 'active' : ''}`}
          onClick={() => { setActiveTab('impacto'); setTxStatus(null); }}
        >
          Prova do Impacto
        </button>
        <button
          className={`tab ${activeTab === 'lookup' ? 'active' : ''}`}
          onClick={() => { setActiveTab('lookup'); setTxStatus(null); }}
        >
          Verificar provas enviadas
        </button>
      </nav>

      {/* Admin Panel - Whitelist Management */}
      {activeTab === 'whitelist' && (
        <div>
          <div className="card">
            <div className="card-title">Gerenciamento da Whitelist</div>
            <p className="card-desc">
              Manage which ONG addresses are authorized to submit impact proofs. Only the admin account can modify the whitelist.
            </p>

            {!isAdmin() && (
              <div className="status-box status-info">
                <span className="status-icon">⚠</span>
                <span>
                  You are not the admin. Only the admin ({shortAddr(adminAddr || '...')}) can call gerenciarWhitelist.
                  You can still check whitelist status below.
                </span>
              </div>
            )}

            <div className="field-group">
              <div className="field">
                <label>ONG Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={wlAddress}
                  onChange={(e) => setWlAddress(e.target.value)}
                />
                <span className="hint">Ethereum address of the organization</span>
              </div>

              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Whitelist Status</div>
                  <div className="toggle-hint">{wlStatus ? 'Add to whitelist (true)' : 'Remove from whitelist (false)'}</div>
                </div>
                <button
                  className={`toggle-switch ${wlStatus ? 'on' : ''}`}
                  onClick={() => setWlStatus(!wlStatus)}
                  disabled={!isAdmin()}
                >
                  <span className="knob"></span>
                </button>
              </div>

              <button className="btn btn-ghost" onClick={checkWhitelist} style={{ marginTop: 0 }}>
                Check Current Status
              </button>

              {wlCheckResult !== null && (
                <div className="status-box status-info" style={{ marginTop: 12 }}>
                  <span className="status-icon">●</span>
                  <span>
                    Address is {wlCheckResult ? 'whitelisted' : 'not whitelisted'}
                  </span>
                  <span className={`whitelist-status ${wlCheckResult ? 'true' : 'false'}`}>
                    {wlCheckResult ? 'AUTHORIZED' : 'NOT AUTHORIZED'}
                  </span>
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleWhitelist}
                disabled={!isAdmin() || !wlAddress}
                style={{ marginTop: 24 }}
              >
                {wlStatus ? 'Add to Whitelist' : 'Remove from Whitelist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Financial Proof Submission */}
      {activeTab === 'financeiro' && (
        <div>
          <div className="card">
            <div className="card-title">Submit Financial Proof</div>
            <p className="card-desc">
              Submit a financial report hash linked to a proof action ID and the destination ONG address.
              This records the financial commitment on-chain for transparency.
            </p>

            <div className="field-group">
              <div className="field">
                <label>Proof Action ID</label>
                <input
                  type="text"
                  placeholder="0x... (32 bytes)"
                  value={finActionId}
                  onChange={(e) => setFinActionId(e.target.value)}
                />
                <span className="hint">Unique bytes32 identifier for this proof action</span>
              </div>

              <div className="field">
                <label>Financial Hash</label>
                <input
                  type="text"
                  placeholder="0x... (32 bytes)"
                  value={finHash}
                  onChange={(e) => setFinHash(e.target.value)}
                />
                <span className="hint">Hash of the financial report document</span>
              </div>

              <div className="field">
                <label>ONG Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={finOng}
                  onChange={(e) => setFinOng(e.target.value)}
                />
                <span className="hint">Address of the receiving organization</span>
              </div>

              <button className="btn btn-primary" onClick={handleFinanceiro} disabled={!finActionId || !finHash || !finOng}>
                Submit Financial Proof
              </button>
            </div>

            {finResult && (
              <div className="proof-result">
                <div className="card-title" style={{ fontSize: 14, marginBottom: 14 }}>Recorded Proof Data</div>
                <div className="proof-row">
                  <span className="proof-key">Financeiro Hash</span>
                  <span className="proof-val">{formatBytes32(finResult.financeiroHash)}</span>
                </div>
                <div className="proof-row">
                  <span className="proof-key">Empresa Doadora</span>
                  <span className="proof-val">{shortAddr(finResult.empresaDoadora)}</span>
                </div>
                <div className="proof-row">
                  <span className="proof-key">ONG Destino</span>
                  <span className="proof-val">{shortAddr(finResult.ongDestino)}</span>
                </div>
                <div className="proof-row">
                  <span className="proof-key">Financeiro Válido</span>
                  <span className={`badge ${finResult.isFinanceiroValido ? 'valid' : 'invalid'}`}>
                    {finResult.isFinanceiroValido ? 'Valid' : 'Pending'}
                  </span>
                </div>
                <div className="proof-row">
                  <span className="proof-key">Selo PinkChain</span>
                  <span className={`badge ${finResult.seloPinkChain ? 'selo' : 'invalid'}`}>
                    {finResult.seloPinkChain ? 'Issued' : 'Not Issued'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Impact Proof Submission */}
      {activeTab === 'impacto' && (
        <div>
          <div className="card">
            <div className="card-title">Submit Impact Proof</div>
            <p className="card-desc">
              Submit an impact proof hash for a given proof action ID. The ONG must be whitelisted.
              When both financial and impact proofs are valid, the PinkChain seal is issued.
            </p>

            <div className="field-group">
              <div className="field">
                <label>Proof Action ID</label>
                <input
                  type="text"
                  placeholder="0x... (32 bytes)"
                  value={impActionId}
                  onChange={(e) => setImpActionId(e.target.value)}
                />
                <span className="hint">Unique bytes32 identifier matching the financial proof</span>
              </div>

              <div className="field">
                <label>Impact Hash</label>
                <input
                  type="text"
                  placeholder="0x... (32 bytes)"
                  value={impHash}
                  onChange={(e) => setImpHash(e.target.value)}
                />
                <span className="hint">Hash of the impact report document</span>
              </div>

              <button className="btn btn-primary" onClick={handleImpacto} disabled={!impActionId || !impHash}>
                Submit Impact Proof
              </button>
            </div>

            {impResult && (
              <div className="proof-result">
                <div className="card-title" style={{ fontSize: 14, marginBottom: 14 }}>Recorded Proof Data</div>
                <div className="proof-row">
                  <span className="proof-key">Impacto Hash</span>
                  <span className="proof-val">{formatBytes32(impResult.impactoHash)}</span>
                </div>
                <div className="proof-row">
                  <span className="proof-key">ONG Destino</span>
                  <span className="proof-val">{shortAddr(impResult.ongDestino)}</span>
                </div>
                <div className="proof-row">
                  <span className="proof-key">Impacto Válido</span>
                  <span className={`badge ${impResult.isImpactoValido ? 'valid' : 'invalid'}`}>
                    {impResult.isImpactoValido ? 'Valid' : 'Pending'}
                  </span>
                </div>
                <div className="proof-row">
                  <span className="proof-key">Selo PinkChain</span>
                  <span className={`badge ${impResult.seloPinkChain ? 'selo' : 'invalid'}`}>
                    {impResult.seloPinkChain ? 'Issued' : 'Not Issued'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proof Lookup */}
      {activeTab === 'lookup' && (
        <div>
          <div className="card">
            <div className="card-title">Proof Lookup</div>
            <p className="card-desc">
              Query the on-chain proof record for any proof action ID to see its financial and impact verification status.
            </p>

            <div className="field-group">
              <div className="field">
                <label>Proof Action ID</label>
                <input
                  type="text"
                  placeholder="0x... (32 bytes)"
                  value={proofLookupId}
                  onChange={(e) => setProofLookupId(e.target.value)}
                />
                <span className="hint">The bytes32 ID used when submitting proofs</span>
              </div>

              <button className="btn btn-primary" onClick={lookupProof} disabled={!proofLookupId || proofLoading} style={{ marginTop: 0 }}>
                {proofLoading ? 'Querying...' : 'Look Up Proof'}
              </button>
            </div>

            {proofLoading && (
              <div className="loading-overlay">
                <div className="spinner"></div>
                <div className="loading-text">Fetching proof data...</div>
              </div>
            )}

            {proofData && !proofLoading && (
              <div className="proof-result">
                <div className="card-title" style={{ fontSize: 14, marginBottom: 14 }}>Proof Record</div>
                <div className="proof-row">
                  <span className="proof-key">Financeiro Hash</span>
                  <span className="proof-val">{formatBytes32(proofData.financeiroHash)}</span>
                </div>
                <div className="proof-row">
                  <span className="proof-key">Impacto Hash</span>
                  <span className="proof-val">{formatBytes32(proofData.impactoHash)}</span>
                </div>
                <div className="proof-row">
                  <span className="proof-key">Empresa Doadora</span>
                  <span className="proof-val">{shortAddr(proofData.empresaDoadora)}</span>
                </div>
                <div className="proof-row">
                  <span className="proof-key">ONG Destino</span>
                  <span className="proof-val">{shortAddr(proofData.ongDestino)}</span>
                </div>
                <div className="proof-row">
                  <span className="proof-key">Financeiro Válido</span>
                  <span className={`badge ${proofData.isFinanceiroValido ? 'valid' : 'invalid'}`}>
                    {proofData.isFinanceiroValido ? 'Valid' : 'Pending'}
                  </span>
                </div>
                <div className="proof-row">
                  <span className="proof-key">Impacto Válido</span>
                  <span className={`badge ${proofData.isImpactoValido ? 'valid' : 'invalid'}`}>
                    {proofData.isImpactoValido ? 'Valid' : 'Pending'}
                  </span>
                </div>
                <div className="proof-row">
                  <span className="proof-key">Selo PinkChain</span>
                  <span className={`badge ${proofData.seloPinkChain ? 'selo' : 'invalid'}`}>
                    {proofData.seloPinkChain ? 'Issued' : 'Not Issued'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction Status */}
      {txStatus && (
        <div className={`status-box status-${txStatus.type}`}>
          <span className="status-icon">
            {txStatus.type === 'success' ? '✓' : txStatus.type === 'error' ? '✕' : '⏳'}
          </span>
          <div>
            <div>{txStatus.msg}</div>
            {txStatus.hash && <div className="tx-hash">TX: {txStatus.hash}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
