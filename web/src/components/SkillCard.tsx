import { Link } from 'react-router-dom'
import { Download, ThumbsUp, Tag, FileText, Archive, User } from 'lucide-react'
import type { Skill } from '../lib/services'

interface Props {
  skill: Skill
  selected?: boolean
  onSelect?: (name: string) => void
  showCheckbox?: boolean
}

export default function SkillCard({ skill, selected, onSelect, showCheckbox }: Props) {
  const tagList = skill.tags ? skill.tags.split(',').map((t) => t.trim()).filter(Boolean) : []

  return (
    <div className={`relative group bg-gray-900 border rounded-xl p-5 transition-all duration-200 hover:border-sky-500/50
      ${selected ? 'border-sky-500 ring-1 ring-sky-500/50' : 'border-white/5'}`}>

      {/* 多选 checkbox */}
      {showCheckbox && (
        <button
          onClick={() => onSelect?.(skill.name)}
          className={`absolute top-3 right-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${selected ? 'bg-sky-500 border-sky-500 text-white' : 'border-gray-600 hover:border-sky-500'}`}>
          {selected && <span className="text-xs font-bold">✓</span>}
        </button>
      )}

      <Link to={`/skills/${skill.name}`} className="block">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3 pr-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
            {skill.file_type === 'md'
              ? <FileText size={18} className="text-sky-500" />
              : <Archive size={18} className="text-blue-500" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate group-hover:text-sky-400 transition-colors">
              {skill.display_name}
            </h3>
            <code className="text-xs text-gray-500">{skill.name}</code>
          </div>
        </div>

        {/* Description */}
        {skill.description && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2 leading-relaxed">
            {skill.description}
          </p>
        )}

        {/* Tags */}
        {tagList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tagList.slice(0, 4).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Tag size={10} />{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-white/5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Download size={12} /> {skill.download_count}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp size={12} className={skill.like_count > 0 ? 'text-sky-400' : ''} />
              {skill.like_count}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <User size={12} />
            <span>{skill.author.username}</span>
            <span className="text-gray-700 ml-1">v{skill.version}</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
