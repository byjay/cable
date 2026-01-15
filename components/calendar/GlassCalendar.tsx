
import React, { useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
    setMonth,
    setYear
} from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    MoreHorizontal,
    Plus,
    Search,
    Bell
} from 'lucide-react';

const GlassCalendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const jumpToToday = () => {
        const now = new Date();
        setCurrentDate(now);
        setSelectedDate(now);
    };

    // Calendar Generation Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    const weeks = [];
    let days = [];
    let day = startDate;

    calendarDays.forEach((d, i) => {
        days.push(d);
        if ((i + 1) % 7 === 0) {
            weeks.push(days);
            days = [];
        }
    });

    // Mock Events Data
    const events = [
        { id: 1, date: new Date(), title: 'Project Kickoff', type: 'meeting', time: '10:00 AM' },
        { id: 2, date: addMonths(new Date(), 0), title: 'Design Review', type: 'work', time: '2:00 PM' },
    ];

    const getDayEvents = (date: Date) => {
        return events.filter(e => isSameDay(e.date, date));
    };

    return (
        <div className="flex h-full w-full bg-[#0f172a] text-slate-100 overflow-hidden font-sans relative">

            {/* Ambient Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Sidebar / Mini Details */}
            <div className="hidden lg:flex w-80 flex-col border-r border-white/10 bg-white/5 backdrop-blur-xl z-10">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <CalendarIcon className="text-blue-400" size={20} />
                        <span>Planner</span>
                    </h2>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors"><Bell size={16} className="text-slate-400" /></button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">You are planning</h3>
                        <div className="text-4xl font-black text-white mb-1">
                            {format(selectedDate, 'd')}
                        </div>
                        <div className="text-lg text-slate-400 font-medium">
                            {format(selectedDate, 'EEEE, MMMM yyyy')}
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Schedule</h3>
                            <button className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-colors">+ Add</button>
                        </div>

                        <div className="space-y-3">
                            {/* Time Slots */}
                            {['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '03:00 PM'].map((time, idx) => (
                                <div key={idx} className="group flex gap-3 text-sm relative">
                                    <div className="w-16 text-right text-slate-500 font-medium text-xs pt-1">{time}</div>
                                    <div className="flex-1 py-3 px-4 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 group-hover:border-white/10 transition-all cursor-pointer relative overflow-hidden">
                                        {idx === 1 ? (
                                            <>
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                                <div className="font-bold text-blue-100">Team Sync</div>
                                                <div className="text-xs text-blue-300/70 mt-0.5">Scrum Master</div>
                                            </>
                                        ) : (
                                            <div className="text-slate-600 italic text-xs group-hover:text-slate-400">No events</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/10">
                    <button className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center gap-2">
                        <Plus size={16} /> Create New Event
                    </button>
                </div>
            </div>

            {/* Main Calendar Area */}
            <div className="flex-1 flex flex-col z-10 bg-black/20 backdrop-blur-sm">

                {/* Header */}
                <div className="h-20 flex items-center justify-between px-8 border-b border-white/10">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1 border border-white/10">
                            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                            <button onClick={jumpToToday} className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 rounded-md transition-colors">Today</button>
                            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors"><ChevronRight size={16} /></button>
                        </div>
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                            {format(currentDate, 'MMMM yyyy')}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-slate-300 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search events..."
                                className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all w-64"
                            />
                        </div>
                        <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
                        <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                            <button className="px-3 py-1 bg-white/10 rounded text-xs font-bold text-white shadow-sm">Month</button>
                            <button className="px-3 py-1 hover:bg-white/5 rounded text-xs font-bold text-slate-400 transition-colors">Week</button>
                            <button className="px-3 py-1 hover:bg-white/5 rounded text-xs font-bold text-slate-400 transition-colors">Day</button>
                        </div>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 mb-4">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div key={day} className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2 min-h-0">
                        {calendarDays.map((day, dayIdx) => {
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const isSelected = isSameDay(day, selectedDate);
                            const isCurrentDay = isToday(day);
                            const dayEvents = getDayEvents(day);

                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                        relative group flex flex-col p-3 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden
                                        ${!isCurrentMonth ? 'opacity-30 bg-transparent border-transparent grayscale' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:-translate-y-0.5'}
                                        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-500/10 z-10' : ''}
                                    `}
                                >
                                    {/* Glass Reflection effect on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`
                                            w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-all
                                            ${isCurrentDay
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                                                : isSelected ? 'bg-white/20 text-white' : 'text-slate-300 group-hover:text-white'}
                                        `}>
                                            {format(day, 'd')}
                                        </span>
                                        {dayEvents.length > 0 && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                                        )}
                                    </div>

                                    {/* Events List */}
                                    <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                                        {dayEvents.map((evt, idx) => (
                                            <div key={idx} className="text-[10px] bg-blue-500/20 text-blue-200 px-2 py-1 rounded border-l-2 border-blue-400 truncate">
                                                {evt.time} {evt.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlassCalendar;
