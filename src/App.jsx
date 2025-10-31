import { useState, useEffect } from 'react';
import { X, Plus, DollarSign, Undo, Download } from 'lucide-react';
import { ToWords } from 'to-words';

// Utility for formatting numbers with commas
const formatNumber = (value) => {
  if (!value) return '';
  const numStr = value.toString().replace(/,/g, '');
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Utility for parsing formatted numbers
const parseFormattedNumber = (value) => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

// Modal Component
const Modal = ({ isOpen, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {children}
      </div>
    </div>
  );
};

function App() {
  const [usdRate, setUsdRate] = useState('');
  const [vndTransactions, setVndTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempTransactions, setTempTransactions] = useState([]);
  const [mainInput, setMainInput] = useState('');
  const [inputHistory, setInputHistory] = useState([]);
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const toWords = new ToWords({ localeCode: 'en-GB' });

  // Quick amount buttons
  const quickAmounts = [1000000, 500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100];

  // PWA Install prompt handler
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if user has previously dismissed the banner
      const bannerDismissed = sessionStorage.getItem('installBannerDismissed');
      if (!bannerDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Handle install button click
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Install prompt not available. Try using the browser menu to install this app.');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }

    setDeferredPrompt(null);
  };

  // Dismiss install banner
  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('installBannerDismissed', 'true');
  };

  // Load data from localStorage on mount
  useEffect(() => {
    const savedUsdRate = localStorage.getItem('usdRate');
    const savedVndTransactions = localStorage.getItem('vndTransactions');

    if (savedUsdRate) setUsdRate(savedUsdRate);
    if (savedVndTransactions) {
      try {
        setVndTransactions(JSON.parse(savedVndTransactions));
      } catch (e) {
        console.error('Error parsing VND transactions:', e);
      }
    }
  }, []);

  // Save USD rate to localStorage
  const handleUsdRateChange = (e) => {
    const value = e.target.value;
    setUsdRate(value);
    localStorage.setItem('usdRate', value);
  };

  // Open modal and initialize temp transactions
  const openModal = () => {
    setTempTransactions([...vndTransactions]);
    setIsModalOpen(true);
  };

  // Add new transaction in modal
  const addTransaction = () => {
    setTempTransactions([...tempTransactions, { rate: '', usdAmount: '' }]);
  };

  // Update transaction field
  const updateTransaction = (index, field, value) => {
    const updated = [...tempTransactions];
    updated[index][field] = value;
    setTempTransactions(updated);
  };

  // Remove transaction
  const removeTransaction = (index) => {
    setTempTransactions(tempTransactions.filter((_, i) => i !== index));
  };

  // Save transactions
  const saveTransactions = () => {
    const validTransactions = tempTransactions.filter(
      t => t.rate && t.usdAmount && parseFloat(t.rate) > 0 && parseFloat(t.usdAmount) > 0
    );
    setVndTransactions(validTransactions);
    localStorage.setItem('vndTransactions', JSON.stringify(validTransactions));
    setIsModalOpen(false);
  };

  // Calculate weighted average VND rate
  const calculateAverageVndRate = () => {
    if (vndTransactions.length === 0) return 0;

    let totalVnd = 0;
    let totalUsd = 0;

    vndTransactions.forEach(t => {
      const rate = parseFloat(t.rate);
      const usd = parseFloat(t.usdAmount);
      totalVnd += rate * usd;
      totalUsd += usd;
    });

    return totalUsd > 0 ? totalVnd / totalUsd : 0;
  };

  // Calculate conversion
  useEffect(() => {
    const vndAmount = parseFormattedNumber(mainInput);
    if (vndAmount > 0 && usdRate && vndTransactions.length > 0) {
      const avgVndRate = calculateAverageVndRate();
      const usdFromRate = parseFloat(usdRate);

      if (avgVndRate > 0 && usdFromRate > 0) {
        // VND -> USD -> LKR
        const lkrAmount = (vndAmount / avgVndRate) * usdFromRate;
        setConvertedAmount(lkrAmount);
      } else {
        setConvertedAmount(0);
      }
    } else {
      setConvertedAmount(0);
    }
  }, [mainInput, usdRate, vndTransactions]);

  // Handle quick amount button click
  const handleQuickAmount = (amount) => {
    const currentValue = parseFormattedNumber(mainInput);
    const newValue = currentValue + amount;
    setInputHistory([...inputHistory, mainInput]);
    setMainInput(formatNumber(newValue));
  };

  // Handle main input change
  const handleMainInputChange = (e) => {
    const value = e.target.value.replace(/,/g, '');
    if (/^\d*$/.test(value)) {
      setInputHistory([...inputHistory, mainInput]);
      setMainInput(formatNumber(value));
    }
  };

  // Clear main input
  const clearMainInput = () => {
    setInputHistory([...inputHistory, mainInput]);
    setMainInput('');
  };

  // Undo last change
  const handleUndo = () => {
    if (inputHistory.length > 0) {
      const newHistory = [...inputHistory];
      const previousValue = newHistory.pop();
      setInputHistory(newHistory);
      setMainInput(previousValue);
    }
  };

  const avgVndRate = calculateAverageVndRate();

  return (
    <div className="min-h-dvh w-screen bg-linear-to-br from-blue-50 to-indigo-100 p-4 pb-8">
      <div className="max-w-2xl mx-auto">
        {/* Install Banner */}
        {showInstallBanner && (
          <div className="bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg p-4 mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Download size={24} className="shrink-0" />
              <div>
                <p className="font-semibold text-sm md:text-base">Install this app for offline use!</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition text-sm md:text-base"
              >
                Install
              </button>
              <button
                onClick={dismissInstallBanner}
                className="p-2 hover:bg-indigo-700 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-xl md:text-3xl font-bold text-gray-800 mb-6 text-center">
            VND to LKR Converter
          </h1>

          {/* USD Rate Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              USD Rate (LKR per 1 USD)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="number"
                value={usdRate}
                onChange={handleUsdRateChange}
                placeholder="USD rate you got from bank"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          {/* VND Transactions Button */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              VND Exchange Transactions
            </label>
            <button
              onClick={openModal}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Manage VND Transactions
            </button>
            {avgVndRate > 0 && (
              <p className="text-sm text-gray-600 mt-2 text-center">
                Average VND Rate: <span className="font-semibold">{formatNumber(avgVndRate.toFixed(2))}</span> VND per USD
              </p>
            )}
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Add Amounts</h2>
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="flex gap-3 pb-2 min-w-max">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleQuickAmount(amount)}
                  className="shrink-0 px-6 py-3 bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-lg shadow-md transition transform hover:scale-105 whitespace-nowrap"
                >
                  {formatNumber(amount)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Input and Conversion Result */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Price in VND</h2>

          {/* Conversion Result */}
          <div className="mb-4 p-4 bg-linear-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
            <p className="text-sm text-gray-600 mb-1">Equivalent in LKR:</p>
            <p className="text-3xl font-bold text-green-700">
              {formatNumber(convertedAmount.toFixed(2))} LKR
            </p>
          </div>

          {/* Main Input */}
          <div className="flex flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="tel"
                inputMode="numeric"
                value={mainInput}
                onChange={handleMainInputChange}
                placeholder="Enter price in VND"
                className="px-4 py-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-xl font-semibold"
              />
              {mainInput && (
                <button
                  onClick={clearMainInput}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  <X size={24} />
                </button>
              )}
            </div>
            <button
              onClick={handleUndo}
              disabled={inputHistory.length === 0}
              className={`px-4 py-4 rounded-lg font-semibold transition flex items-center justify-center ${inputHistory.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              title="Undo"
            >
              <Undo size={24} />
            </button>
          </div>

          {mainInput && <div className='mt-2'>{toWords.convert(parseFormattedNumber(mainInput))}</div>}

          {/* Info Messages */}
          {!usdRate && (
            <p className="text-sm text-amber-600 mt-4">⚠️ Please enter the USD rate first</p>
          )}
          {usdRate && vndTransactions.length === 0 && (
            <p className="text-sm text-amber-600 mt-4">⚠️ Please add VND transactions to calculate conversions</p>
          )}
        </div>

        {/* VND Bills */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">VND Bills</h2>
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="flex gap-3 pb-2 min-w-max">
              <img src='500000.jpg' alt="500000" className='w-56' />
              <img src='200000.jpg' alt="200000" className='w-56' />
              <img src='100000.jpg' alt="100000" className='w-56' />
              <img src='50000.jpg' alt="50000" className='w-56' />
              <img src='20000.jpg' alt="20000" className='w-56' />
              <img src='10000.jpg' alt="10000" className='w-56' />
              <img src='5000.jpg' alt="5000" className='w-56' />
              <img src='2000.jpg' alt="2000" className='w-56' />
              <img src='1000.jpg' alt="1000" className='w-56' />
            </div>
          </div>
        </div>

      </div>

      {/* Modal for VND Transactions */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">VND Exchange Transactions</h2>
          <p className="text-sm text-gray-600 mt-1">Add the rates and amounts you exchanged USD to VND</p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {tempTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions yet. Click "Add Transaction" to start.</p>
          ) : (
            <div className="space-y-4">
              {tempTransactions.map((transaction, index) => (
                <div key={index} className="flex gap-3 items-start bg-gray-50 p-4 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">VND per 1 USD</label>
                    <input
                      type="number"
                      value={transaction.rate}
                      onChange={(e) => updateTransaction(index, 'rate', e.target.value)}
                      placeholder="VND Rate"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">USD Amount</label>
                    <input
                      type="number"
                      value={transaction.usdAmount}
                      onChange={(e) => updateTransaction(index, 'usdAmount', e.target.value)}
                      placeholder="Given USD cash"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <button
                    onClick={() => removeTransaction(index)}
                    className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-md transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addTransaction}
            className="w-full mt-4 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add Transaction
          </button>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => setIsModalOpen(false)}
            className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={saveTransactions}
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
          >
            Save
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default App;