import { useState } from 'react'

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const typeColors = {
  agendamento: 'bg-blue-500',
  tarefa: 'bg-purple-500',
  financeiro: 'bg-green-500',
  lembrete: 'bg-yellow-500',
  os: 'bg-orange-500',
  pessoal: 'bg-pink-500',
}

export function Calendar({ events = [], onDayClick, onEventClick }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)) }
  function goToday() { setCurrentDate(new Date()) }

  const cells = []

  // Dias do mês anterior
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, currentMonth: false, date: null })
  }

  // Dias do mês atual
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, currentMonth: true, date: dateStr })
  }

  // Dias do próximo mês
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, currentMonth: false, date: null })
  }

  function getEventsForDate(dateStr) {
    return events.filter(e => e.date === dateStr)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </button>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{months[month]} {year}</h2>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
        <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
          Hoje
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">{day}</div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const dayEvents = cell.date ? getEventsForDate(cell.date) : []
          const isToday = cell.date === todayStr
          return (
            <div
              key={idx}
              onClick={() => cell.currentMonth && onDayClick && onDayClick(cell.date)}
              className={`min-h-[90px] p-1.5 border-b border-r border-gray-100 dark:border-gray-800 transition-colors
                ${cell.currentMonth ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : 'bg-gray-50/50 dark:bg-gray-900/50'}
                ${idx % 7 === 6 ? 'border-r-0' : ''}
              `}
            >
              <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 font-medium
                ${isToday ? 'bg-blue-600 text-white' : cell.currentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'}
              `}>
                {cell.day}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map((event, i) => (
                  <div
                    key={i}
                    onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(event) }}
                    className={`text-xs px-1.5 py-0.5 rounded text-white truncate cursor-pointer ${typeColors[event.type] || 'bg-gray-500'}`}
                    title={event.title}
                  >
                    {event.time && <span className="opacity-75">{event.time.slice(0, 5)} </span>}
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 px-1">+{dayEvents.length - 3} mais</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 flex flex-wrap gap-3">
        {Object.entries(typeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
