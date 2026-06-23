import { useState } from 'react'

const slides = [
  {
    title: 'Gerencie seus negócios',
    description: 'Centralize todas as informações dos seus empreendimentos em um único lugar.',
  },
  {
    title: 'Controle financeiro completo',
    description: 'Acompanhe entradas, saídas e fluxo de caixa de forma simples e eficiente.',
  },
  {
    title: 'Clientes e serviços',
    description: 'Cadastre clientes, serviços e ordens de serviço com histórico completo.',
  },
]

export function Carousel() {
  const [current, setCurrent] = useState(0)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 w-full">
      <div className="min-h-[120px]">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {slides[current].title}
        </h3>
        <p className="text-gray-500 text-sm leading-relaxed">
          {slides[current].description}
        </p>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ←
        </button>

        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                i === current ? 'bg-blue-600 w-4' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          →
        </button>
      </div>
    </div>
  )
}