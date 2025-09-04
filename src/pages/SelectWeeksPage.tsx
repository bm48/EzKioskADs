import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Clock, DollarSign, CheckCircle, MapPin } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';

type BookingType = 'weekly' | 'subscription';

function getWeeklyRate(priceText?: string): number {
  if (!priceText) return 0;
  const match = priceText.replace(/[^0-9.]/g, '');
  const num = parseFloat(match);
  return isNaN(num) ? 0 : num;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthGrid(date: Date) {
  const first = startOfMonth(date);
  const startDay = first.getDay(); // 0 Sun .. 6 Sat
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(date.getFullYear(), date.getMonth(), d));
  return cells;
}

export default function SelectWeeksPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: any };
  const kiosk = location.state?.kiosk;
  const weeklyRate = getWeeklyRate(kiosk?.price);

  const steps = [
    { number: 1, name: 'Setup Service', current: false, completed: true },
    { number: 2, name: 'Select Kiosk', current: false, completed: true },
    { number: 3, name: 'Choose Weeks', current: true, completed: false },
    { number: 4, name: 'Add Media & Duration', current: false, completed: false },
    { number: 5, name: 'Review & Submit', current: false, completed: false }
  ];

  const [bookingType, setBookingType] = React.useState<BookingType>('weekly');
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(new Date());
  const [selectedMondays, setSelectedMondays] = React.useState<string[]>([]); // ISO dates

  // Subscription state
  const [subSlots, setSubSlots] = React.useState<number>(1);
  const [subCommit3mo, setSubCommit3mo] = React.useState<boolean>(false);
  const [subStartMonday, setSubStartMonday] = React.useState<string | null>(null);

  const cells = React.useMemo(() => getMonthGrid(calendarMonth), [calendarMonth]);
  const isMonday = (d: Date) => d.getDay() === 1;
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  
  // Check if a date is in the past
  const isPastDate = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const toggleWeeklyMonday = (d: Date) => {
    if (isPastDate(d)) return; // Prevent selection of past dates
    const id = fmt(d);
    setSelectedMondays((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectSubscriptionStart = (d: Date) => {
    if (isPastDate(d)) return; // Prevent selection of past dates
    setSubStartMonday(fmt(d));
  };

  const weeklyValid = selectedMondays.length > 0;
  const subscriptionValid = subStartMonday !== null && subSlots > 0;
  const canContinue = bookingType === 'weekly' ? weeklyValid : subscriptionValid;

  const baseWeeklyCost = subSlots * weeklyRate;
  const monthlyCost = baseWeeklyCost * 4;
  const discount = subCommit3mo ? 0.15 : 0;
  const monthlyCostAfterDiscount = monthlyCost * (1 - discount);

  // ---- Weekly summaries under calendar ----
  const toDate = (iso: string) => new Date(iso + 'T00:00:00');
  const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  const formatRange = (start: Date, end: Date) => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString(undefined, opts);
    const endStr = end.toLocaleDateString(undefined, opts);
    const yearStr = end.getFullYear();
    return `${startStr} - ${endStr}, ${yearStr}`;
  };
  const sortedMondays = React.useMemo(() => [...selectedMondays].sort(), [selectedMondays]);
  type Block = { start: Date; end: Date; count: number };
  const blocks: Block[] = React.useMemo(() => {
    const b: Block[] = [];
    let i = 0;
    while (i < sortedMondays.length) {
      const start = toDate(sortedMondays[i]);
      let end = addDays(start, 6);
      let count = 1;
      let j = i + 1;
      while (j < sortedMondays.length) {
        const next = toDate(sortedMondays[j]);
        const expectedNext = addDays(start, count * 7);
        if (next.getTime() === expectedNext.getTime()) {
          count += 1;
          end = addDays(next, 6);
          j += 1;
        } else {
          break;
        }
      }
      b.push({ start, end, count });
      i = j;
    }
    return b;
  }, [sortedMondays]);

  return (
    <DashboardLayout title="Create New Campaign" subtitle="" showBreadcrumb={false}>

      {/* Steps */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shadow-soft ${
                step.completed 
                  ? 'bg-green-600 text-white' 
                  : step.current
                  ? 'bg-black text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {step.completed ? '✓' : step.number}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                step.current ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-1 mx-4 ${
                  step.completed ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Back Navigation */}
      <div className="mb-8">
        <button 
          onClick={() => navigate('/client/kiosk-selection')} 
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Select Kiosk</span>
        </button>
      </div>

      {/* Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 mb-8">
        <div className="mb-6">
          <div className="text-sm text-gray-600 dark:text-gray-300">Choose Weeks</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">{kiosk?.name || 'Selected Kiosk'}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{kiosk?.city || 'Location'}</div>
        </div>
        
        {/* Enhanced Kiosk Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border border-blue-200 dark:border-gray-600 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-semibold text-blue-800 dark:text-blue-200">{kiosk?.name || 'Selected Kiosk'}</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">{kiosk?.city || 'Location'}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{kiosk?.price || '$0/week'}</div>
              <div className="text-sm text-blue-500 dark:text-blue-400">per week</div>
            </div>
          </div>
        </div>
        
        <div className="rounded border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300 mb-6">
          Weekly Selection — Select weeks (Monday to Sunday) for your campaign.
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => setBookingType('weekly')}
            className={`group relative border-2 rounded-xl p-6 text-left shadow-soft hover:shadow-elevated transition-all duration-200 ${
              bookingType === 'weekly' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-100 dark:ring-blue-900/30' 
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                bookingType === 'weekly' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className={`font-bold text-lg ${
                  bookingType === 'weekly' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                }`}>Week-by-Week</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Select specific weeks for your campaign</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Perfect for seasonal campaigns or specific event promotions. Choose exactly which weeks work best for your business.
            </div>
            {bookingType === 'weekly' && (
              <div className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            )}
          </button>
          
          <button 
            onClick={() => setBookingType('subscription')}
            className={`group relative border-2 rounded-xl p-6 text-left shadow-soft hover:shadow-elevated transition-all duration-200 ${
              bookingType === 'subscription' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-100 dark:ring-blue-900/30' 
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                bookingType === 'subscription' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className={`font-bold text-lg ${
                  bookingType === 'subscription' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                }`}>Subscription</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Monthly subscription with guaranteed slots</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Get consistent exposure with reserved slots. Save 15% with 3-month commitment and never worry about availability.
            </div>
            {bookingType === 'subscription' && (
              <div className="absolute top-4 right-4 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            )}
          </button>
        </div>

        {/* Week-by-week calendar */}
        {bookingType === 'weekly' && (
          <div>
            <div className="mb-3 text-sm font-semibold flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Select Weeks</span>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-900/50 max-w-2xl shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {calendarMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()-1, 1))} 
                    className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 flex items-center justify-center shadow-soft"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()+1, 1))} 
                    className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 flex items-center justify-center shadow-soft"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-2 text-sm font-semibold text-center text-gray-600 dark:text-gray-400 mb-4">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {cells.map((c, i) => c ? (
                  <button
                    key={i}
                    disabled={!isMonday(c) || isPastDate(c)}
                    onClick={() => isMonday(c) && toggleWeeklyMonday(c)}
                    className={`h-12 text-sm rounded-xl font-medium transition-all duration-200 ${
                      !isMonday(c) 
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                        : isPastDate(c)
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                        : selectedMondays.includes(fmt(c))
                          ? 'bg-blue-500 text-white shadow-lg scale-105 ring-2 ring-blue-200 dark:ring-blue-800' 
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700 border border-transparent'
                    }`}>
                    {c.getDate()}
                  </button>
                ) : <div key={i} />)}
              </div>
              
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 dark:text-gray-300 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded border"/>
                  <span>Available Mondays</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-4 h-4 bg-blue-500 rounded"/>
                  <span>Selected Weeks</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded border"/>
                  <span>Past Dates</span>
                </div>
              </div>
            </div>

            {/* Selected Weeks & Campaign Blocks */}
            {selectedMondays.length > 0 ? (
              <div className="mt-6 space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-green-800 dark:text-green-200">Weeks Selected</div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        You have selected {selectedMondays.length} week{selectedMondays.length > 1 ? 's' : ''} for your campaign
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-soft">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-900 dark:text-white">Selected Weeks</div>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">{selectedMondays.length} week{selectedMondays.length > 1 ? 's' : ''} selected</span>
                  </div>
                  {sortedMondays.map((iso, idx) => {
                    const start = toDate(iso);
                    const end = addDays(start, 6);
                    return (
                      <div key={iso} className="text-sm text-gray-800 dark:text-gray-200">
                        Week {idx + 1}: {formatRange(start, end)}
                      </div>
                    );
                  })}
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-soft">
                  <div className="font-semibold text-gray-900 dark:text-white mb-2">Campaign Blocks</div>
                  <div className="space-y-3">
                    {blocks.map((b, i) => (
                      <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                        <div className="font-medium text-gray-900 dark:text-white">Campaign {i+1}:</div>
                        <div className="text-sm text-gray-800 dark:text-gray-200">{formatRange(b.start, b.end)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{b.count} consecutive {b.count === 1 ? 'week' : 'weeks'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No weeks selected yet</h3>
                <p className="text-gray-600 dark:text-gray-300">Click on the available Mondays above to select weeks for your campaign.</p>
              </div>
            )}
          </div>
        )}

        {/* Subscription controls */}
        {bookingType === 'subscription' && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>Subscription Configuration</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-900 dark:text-white flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span>Ad Slots Per Week</span>
                    </label>
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={() => setSubSlots(Math.max(1, subSlots-1))} 
                        className="w-12 h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 flex items-center justify-center text-xl font-bold shadow-soft"
                      >
                        -
                      </button>
                      <div className="w-20 h-12 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{subSlots}</span>
                      </div>
                      <button 
                        onClick={() => setSubSlots(subSlots+1)} 
                        className="w-12 h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 flex items-center justify-center text-xl font-bold shadow-soft"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Each slot represents one week of advertising</p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                    <label className="inline-flex items-center space-x-3 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={subCommit3mo} 
                        onChange={(e) => setSubCommit3mo(e.target.checked)}
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <div>
                        <span className="font-semibold text-blue-800 dark:text-blue-200">3-Month Commitment</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-semibold">
                            15% OFF
                          </span>
                          <span className="text-blue-600 dark:text-blue-400 text-sm">Save on monthly billing</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span>Pricing Breakdown</span>
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Base weekly cost:</span>
                      <span className="font-medium">{subSlots} × {kiosk?.price || '$0'} = ${baseWeeklyCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Monthly cost (4 weeks):</span>
                      <span className="font-medium">${monthlyCost.toFixed(2)}</span>
                    </div>
                    {subCommit3mo && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Discount applied (15%):</span>
                        <span className="font-medium">-${(monthlyCost*0.15).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                      <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                        <span>Monthly billing:</span>
                        <span>${monthlyCostAfterDiscount.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-right">per month</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

                         <div className="mb-3 text-sm font-semibold flex items-center space-x-2">
               <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
               <span>Select Start Week</span>
             </div>
             <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-900/50 max-w-2xl shadow-soft">
               <div className="flex items-center justify-between mb-4">
                 <div className="text-lg font-semibold text-gray-900 dark:text-white">
                   {calendarMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                 </div>
                 <div className="flex items-center space-x-3">
                   <button 
                     onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()-1, 1))} 
                     className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 flex items-center justify-center shadow-soft"
                   >
                     <ChevronLeft className="h-5 w-5" />
                   </button>
                   <button 
                     onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth()+1, 1))} 
                     className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 flex items-center justify-center shadow-soft"
                   >
                     <ChevronRight className="h-5 w-5" />
                   </button>
                 </div>
               </div>
               
               <div className="grid grid-cols-7 gap-2 text-sm font-semibold text-center text-gray-600 dark:text-gray-400 mb-4">
                 {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
               </div>
               <div className="grid grid-cols-7 gap-2">
                 {cells.map((c, i) => c ? (
                   <button
                     key={i}
                     disabled={!isMonday(c) || isPastDate(c)}
                     onClick={() => isMonday(c) && selectSubscriptionStart(c)}
                     className={`h-12 text-sm rounded-xl font-medium transition-all duration-200 ${
                       !isMonday(c) 
                         ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                         : isPastDate(c)
                         ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                         : subStartMonday === fmt(c) 
                           ? 'bg-blue-500 text-white shadow-lg scale-105 ring-2 ring-blue-200 dark:ring-blue-800' 
                           : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700 border border-transparent'
                     }`}>
                     {c.getDate()}
                   </button>
                 ) : <div key={i} />)}
               </div>
               
               <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 dark:text-gray-300 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                 <div className="flex items-center space-x-2">
                   <span className="inline-block w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded border"/>
                   <span>Available Mondays</span>
                 </div>
                 <div className="flex items-center space-x-2">
                   <span className="inline-block w-4 h-4 bg-blue-500 rounded"/>
                   <span>Selected Start</span>
                 </div>
                 <div className="flex items-center space-x-2">
                   <span className="inline-block w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded border"/>
                   <span>Past Dates</span>
                 </div>
               </div>
             </div>

            {subStartMonday && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-green-800 dark:text-green-200">Start Week Selected</div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      Your subscription will begin the week of {formatRange(toDate(subStartMonday), addDays(toDate(subStartMonday), 6))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button 
            onClick={() => {
              if (canContinue) {
                let campaignData;
                
                if (bookingType === 'weekly') {
                  campaignData = {
                    kiosk,
                    selectedWeeks: selectedMondays.map(date => ({
                      startDate: date,
                      endDate: new Date(new Date(date).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      slots: 1
                    })),
                    totalSlots: selectedMondays.length,
                    baseRate: weeklyRate
                  };
                } else {
                  // Subscription case
                  campaignData = {
                    kiosk,
                    selectedWeeks: [{
                      startDate: subStartMonday!,
                      endDate: new Date(new Date(subStartMonday!).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      slots: subSlots
                    }],
                    totalSlots: subSlots,
                    baseRate: weeklyRate
                  };
                }
                
                navigate('/client/add-media-duration', { state: campaignData });
              }
            }}
            disabled={!canContinue} 
            className={`group relative px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-soft ${
              canContinue 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canContinue ? (
              <div className="flex items-center space-x-3">
                <span>Continue to Ad Duration & Media</span>
                <ArrowLeft className="h-5 w-5 transform rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            ) : (
              <span>Select weeks to continue</span>
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
