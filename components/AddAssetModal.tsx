'use client';

import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { NumericFormat } from 'react-number-format';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'add' | 'edit';
  initialData?: {
    id: string;
    assetType: 'fund' | 'stock' | 'crypto';
    assetId: string;
    assetName: string;
    quantity: number;
    avgBuyPrice: number;
    notes?: string | null;
  };
}

export default function AddAssetModal({ isOpen, onClose, onSuccess, mode = 'add', initialData }: AddAssetModalProps) {
  const [assetType, setAssetType] = useState<'fund' | 'stock' | 'crypto'>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>({ funds: [], stocks: [], cryptos: [] });
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [avgBuyPrice, setAvgBuyPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Populate form when in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData && isOpen) {
      setAssetType(initialData.assetType);
      setSelectedAsset({
        id: initialData.assetId,
        name: initialData.assetName,
        symbol: initialData.assetId,
      });
      setQuantity(initialData.quantity.toString());
      setAvgBuyPrice(initialData.avgBuyPrice.toString());
      setNotes(initialData.notes || '');
    }
  }, [mode, initialData, isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Autocomplete with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length < 1) {
      setSearchResults({ funds: [], stocks: [], cryptos: [] });
      setShowResults(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-assets?q=${encodeURIComponent(searchQuery)}&type=${assetType}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.results);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, assetType]);

  const handleSelectAsset = (asset: any) => {
    setSelectedAsset(asset);
    setAvgBuyPrice(asset.price?.toFixed(2) || '');
    setSearchQuery('');
    setShowResults(false);
    setSearchResults({ funds: [], stocks: [], cryptos: [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!quantity || !avgBuyPrice) {
      setMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (mode === 'add' && !selectedAsset) {
      setMessage('กรุณาเลือก Asset');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/portfolio', {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'edit'
            ? {
                id: initialData?.id,
                quantity: parseFloat(quantity),
                avgBuyPrice: parseFloat(avgBuyPrice),
                notes,
              }
            : {
                assetType,
                assetId: selectedAsset.id,
                assetName: selectedAsset.name || selectedAsset.symbol,
                quantity: parseFloat(quantity),
                avgBuyPrice: parseFloat(avgBuyPrice),
                notes,
              }
        ),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(mode === 'edit' ? 'แก้ไข Asset สำเร็จ! ✓' : 'เพิ่ม Asset สำเร็จ! ✓');
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 1000);
      } else {
        setMessage(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      setMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAssetType('stock');
    setSearchQuery('');
    setSearchResults({ funds: [], stocks: [], cryptos: [] });
    setSelectedAsset(null);
    setQuantity('');
    setAvgBuyPrice('');
    setNotes('');
    setMessage('');
    onClose();
  };

  if (!isOpen) return null;

  const currentResults = 
    assetType === 'fund' ? searchResults.funds :
    assetType === 'stock' ? searchResults.stocks :
    searchResults.cryptos;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-3 animate-fade-in">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md sm:max-w-lg max-h-[96vh] sm:max-h-[92vh] overflow-y-auto animate-scale-in border border-purple-100">
        {/* Header - Minimal Clean */}
        <div className="sticky top-0 bg-white text-gray-900 p-4 sm:p-5 rounded-t-xl sm:rounded-t-2xl flex items-center justify-between border-b border-purple-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Icon icon={mode === 'edit' ? "solar:pen-bold-duotone" : "solar:add-square-bold-duotone"} className="w-7 h-7 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <h2 className="text-base sm:text-xl font-bold">{mode === 'edit' ? 'แก้ไข Asset' : 'เพิ่ม Asset'}</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-11 h-11 hover:bg-gray-100 rounded-lg transition-all flex items-center justify-center"
          >
            <Icon icon="solar:close-circle-bold-duotone" className="w-9 h-9 text-purple-600" />
          </button>
        </div>

        {/* Body - Minimal Clean */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Show Asset Info if Edit Mode */}
          {mode === 'edit' && initialData && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="solar:info-circle-bold-duotone" className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-700">กำลังแก้ไข</span>
              </div>
              <div className="font-bold text-gray-900 text-sm">{initialData.assetName}</div>
              <div className="text-xs text-gray-600">{initialData.assetId}</div>
              <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {initialData.assetType === 'fund' ? 'กองทุน' : initialData.assetType === 'stock' ? 'หุ้น' : 'Crypto'}
              </span>
            </div>
          )}

          {/* Asset Type Selection - Only in Add Mode */}
          {mode === 'add' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">ประเภท Asset</label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => { setAssetType('fund'); setSelectedAsset(null); setSearchQuery(''); setShowResults(false); }}
                className={`px-3 py-3 sm:py-4 rounded-xl font-medium transition-all flex flex-col items-center justify-center gap-1 sm:gap-2 text-xs ${
                  assetType === 'fund'
                    ? 'bg-purple-600 text-white shadow-md scale-105'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <Icon icon="lucide:chart-line" className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>กองทุน</span>
              </button>
              <button
                type="button"
                onClick={() => { setAssetType('stock'); setSelectedAsset(null); setSearchQuery(''); setShowResults(false); }}
                className={`px-3 py-3 sm:py-4 rounded-xl font-medium transition-all flex flex-col items-center justify-center gap-1 sm:gap-2 text-xs ${
                  assetType === 'stock'
                    ? 'bg-purple-600 text-white shadow-md scale-105'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <Icon icon="ri:funds-box-fill" className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>หุ้น</span>
              </button>
              <button
                type="button"
                onClick={() => { setAssetType('crypto'); setSelectedAsset(null); setSearchQuery(''); setShowResults(false); }}
                className={`px-3 py-3 sm:py-4 rounded-xl font-medium transition-all flex flex-col items-center justify-center gap-1 sm:gap-2 text-xs ${
                  assetType === 'crypto'
                    ? 'bg-purple-600 text-white shadow-md scale-105'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <Icon icon="lineicons:bitcoin" className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Crypto</span>
              </button>
            </div>
          </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4">
            {/* Search Asset with Autocomplete - Only in Add Mode */}
            {mode === 'add' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Icon icon="solar:magnifer-bold-duotone" className="w-4 h-4 text-purple-600" />
                ค้นหา {assetType === 'fund' ? 'กองทุน' : assetType === 'stock' ? 'หุ้น' : 'Crypto'}
              </label>
              
              {selectedAsset ? (
                <div className="flex items-center justify-between p-3 sm:p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Icon icon="solar:check-circle-bold-duotone" className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-gray-900 text-sm truncate">{selectedAsset.name}</div>
                      <div className="text-xs text-gray-600 truncate">
                        {assetType === 'fund' && selectedAsset.abbr}
                        {assetType === 'stock' && `${selectedAsset.symbol} (${selectedAsset.market})`}
                        {assetType === 'crypto' && selectedAsset.symbol}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAsset(null)}
                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all text-xs flex-shrink-0 ml-2 font-medium"
                  >
                    เปลี่ยน
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowResults(true)}
                    className="w-full px-4 py-3 pr-10 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all text-sm bg-white"
                    placeholder={`พิมพ์เพื่อค้นหา${assetType === 'fund' ? 'ชื่อกองทุน' : assetType === 'stock' ? 'สัญลักษณ์หุ้น' : 'ชื่อเหรียญ'}...`}
                    autoComplete="off"
                  />
                  {searching && (
                    <Icon icon="solar:hourglass-bold-duotone" className="w-4 h-4 text-purple-600 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
                  )}
                  
                  {/* Autocomplete Results */}
                  {showResults && currentResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border-2 border-purple-300 rounded-lg shadow-2xl max-h-48 sm:max-h-60 overflow-y-auto z-10">
                      {currentResults.map((result: any, index: number) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectAsset(result)}
                          className="w-full px-2.5 sm:px-3 py-2 text-left hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all border-b border-purple-100 last:border-0 active:bg-purple-100"
                        >
                          <div className="font-semibold text-text-primary text-xs sm:text-sm truncate">{result.name}</div>
                          <div className="text-[10px] sm:text-xs text-text-secondary flex items-center justify-between gap-2 mt-0.5">
                            <span className="truncate">
                              {assetType === 'fund' && result.abbr}
                              {assetType === 'stock' && `${result.symbol} (${result.market})`}
                              {assetType === 'crypto' && result.symbol}
                            </span>
                            {result.price && (
                              <span className="font-medium text-purple-600 flex-shrink-0">
                                ฿{result.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* No Results Message */}
                  {showResults && searchQuery && !searching && currentResults.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border-2 border-purple-200 rounded-lg shadow-xl p-3 text-center text-text-secondary text-xs z-10">
                      <Icon icon="solar:magnifer-bug-bold-duotone" className="w-6 h-6 sm:w-7 sm:h-7 mx-auto mb-1.5 text-purple-400" />
                      ไม่พบข้อมูล
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
                <Icon icon="solar:calculator-bold-duotone" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-500" />
                จำนวน (หน่วย)
              </label>
              <NumericFormat
                value={quantity}
                onValueChange={(values) => setQuantity(values.value)}
                thousandSeparator=","
                decimalSeparator="."
                decimalScale={5}
                allowNegative={false}
                className="w-full px-3 py-2 border-2 border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-all text-xs sm:text-sm bg-white shadow-sm"
                placeholder="0.00"
                required
              />
            </div>

            {/* Average Buy Price */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
                <Icon icon="solar:wallet-money-bold-duotone" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
                ราคาทุนเฉลี่ย (บาท/หน่วย)
              </label>
              <NumericFormat
                value={avgBuyPrice}
                onValueChange={(values) => setAvgBuyPrice(values.value)}
                thousandSeparator=","
                decimalSeparator="."
                decimalScale={5}
                allowNegative={false}
                className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all text-xs sm:text-sm bg-white shadow-sm"
                placeholder="0.00"
                required
              />
            </div>

            {/* Total Cost Display */}
            {quantity && avgBuyPrice && (
              <div className="p-2 sm:p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border-2 border-purple-300 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-purple-700">มูลค่าทุนรวม:</span>
                  <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    ฿{(parseFloat(quantity) * parseFloat(avgBuyPrice)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
                <Icon icon="solar:document-text-bold-duotone" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-500" />
                หมายเหตุ (ไม่บังคับ)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border-2 border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-all resize-none text-xs sm:text-sm bg-white shadow-sm"
                placeholder="ระบุหมายเหตุหรือรายละเอียดเพิ่มเติม..."
                rows={2}
              />
            </div>

            {/* Message */}
            {message && (
              <div
                className={`p-2 sm:p-2.5 rounded-lg text-[10px] sm:text-xs flex items-start gap-1.5 shadow-sm ${
                  message.includes('✓')
                    ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 text-purple-700'
                    : 'bg-red-50 border-2 border-red-200 text-red-700'
                }`}
              >
                <Icon 
                  icon={message.includes('✓') ? 'solar:check-circle-bold-duotone' : 'solar:danger-circle-bold-duotone'} 
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" 
                />
                <span>{message}</span>
              </div>
            )}

            {/* Submit Button - Mobile First */}
            <button
              type="submit"
              disabled={loading || !selectedAsset}
              className="w-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 hover:from-purple-500 hover:via-pink-500 hover:to-purple-500 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-1.5 text-sm"
            >
              {loading ? (
                <>
                  <Icon icon="solar:hourglass-bold-duotone" className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>กำลังเพิ่ม...</span>
                </>
              ) : (
                <>
                  <Icon icon="solar:add-circle-bold-duotone" className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>เพิ่ม Asset</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

