'use client'

import React, { useMemo } from 'react'
import { Folder, Key, Link2 } from 'lucide-react'



interface SchemaVisualizerProps {
  files: Array<{ path: string; content: string; language: string }>
}

interface DBField {
  name: string
  type: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  referencesTable?: string
}

interface DBTable {
  name: string
  fields: DBField[]
}

export default function SchemaVisualizer({ files }: SchemaVisualizerProps) {
  // Parse SQL files to extract tables, columns, and relations using regex
  const tables = useMemo<DBTable[]>(() => {
    const parsedTables: DBTable[] = []
    
    // Find all SQL files
    const sqlFiles = files.filter(f => f.language === 'sql' || f.path.endsWith('.sql'))
    if (sqlFiles.length === 0) {
      // Return fallback demo tables if no database migrations are generated yet
      return [
        {
          name: 'users (Reference)',
          fields: [
            { name: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false },
            { name: 'email', type: 'TEXT', isPrimaryKey: false, isForeignKey: false }
          ]
        },
        {
          name: 'waiting_list',
          fields: [
            { name: 'id', type: 'UUID', isPrimaryKey: true, isForeignKey: false },
            { name: 'founder_id', type: 'UUID', isPrimaryKey: false, isForeignKey: true, referencesTable: 'users' },
            { name: 'email', type: 'TEXT', isPrimaryKey: false, isForeignKey: false },
            { name: 'created_at', type: 'TIMESTAMPTZ', isPrimaryKey: false, isForeignKey: false }
          ]
        }
      ]
    }

    sqlFiles.forEach(file => {
      const sql = file.content
      
      // Match CREATE TABLE statements
      const tableMatches = sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\);/gi)
      
      for (const match of tableMatches) {
        const tableName = match[1]
        const columnsBlock = match[2]
        
        const fields: DBField[] = []
        
        // Split lines by comma (approximate parsing)
        const lines = columnsBlock.split(',')
        
        lines.forEach(line => {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('--') || trimmed.toUpperCase().startsWith('CONSTRAINT') || trimmed.toUpperCase().startsWith('FOREIGN KEY') || trimmed.toUpperCase().startsWith('PRIMARY KEY (')) return
          
          // Match column name and type: "id UUID PRIMARY KEY REFERENCES table(col)"
          const words = trimmed.split(/\s+/)
          if (words.length < 2) return
          
          const fieldName = words[0].replace(/"/g, '')
          const fieldType = words[1].toUpperCase()
          
          const upperTrimmed = trimmed.toUpperCase()
          const isPrimaryKey = upperTrimmed.includes('PRIMARY KEY')
          const isForeignKey = upperTrimmed.includes('REFERENCES')
          
          let referencesTable: string | undefined
          if (isForeignKey) {
            const refMatch = trimmed.match(/REFERENCES\s+(\w+)/i)
            if (refMatch) {
              referencesTable = refMatch[1]
            }
          } else if (fieldName.endsWith('_id')) {
            // Logical fallback relationship
            referencesTable = fieldName.slice(0, -3) + 's'
          }

          fields.push({
            name: fieldName,
            type: fieldType,
            isPrimaryKey,
            isForeignKey,
            referencesTable
          })
        })

        if (fields.length > 0) {
          parsedTables.push({
            name: tableName,
            fields
          })
        }
      }
    })

    return parsedTables
  }, [files])

  return (
    <div className="flex flex-col h-full bg-[#050505] rounded-2xl border border-[#1a1a1a] overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#1a1a1a]/85 bg-zinc-950/20">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-zinc-300 font-mono">Relational DB Schema Map</span>
        </div>
        <span className="text-[10px] text-zinc-550 font-mono">
          Parsed: {tables.length} tables
        </span>
      </div>

      {/* Visual Workspace grid */}
      <div className="flex-1 bg-[#030303] p-8 overflow-auto">
        {tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-650 font-mono gap-2 py-20 text-xs">
            <span>No database migrations found in current file workspace.</span>
            <span>Provision schemas or tables in configuration to map structures.</span>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-start select-none">
            {tables.map((table, tIdx) => (
              <div 
                key={tIdx} 
                className="rounded-xl border border-zinc-900 bg-zinc-950/70 p-4 space-y-3 shadow-xl hover:border-zinc-800 transition-all group"
              >
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-2">
                    <Folder className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                    <span className="text-xs font-bold font-mono text-zinc-200 group-hover:text-indigo-400 transition-colors">
                      {table.name}
                    </span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono">
                    Table
                  </span>
                </div>

                {/* Table Fields */}
                <div className="space-y-1.5">
                  {table.fields.map((field, fIdx) => (
                    <div 
                      key={fIdx} 
                      className="flex items-center justify-between py-1 text-[11px] font-mono hover:bg-white/[0.01] px-1 rounded transition-all"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {field.isPrimaryKey ? (
                          <Key className="h-3 w-3 text-amber-500 shrink-0" />
                        ) : field.isForeignKey ? (
                          <Link2 className="h-3 w-3 text-indigo-400 shrink-0" />
                        ) : (
                          <span className="text-zinc-700 text-[8px] pl-1 select-none">•</span>
                        )}
                        <span className={`text-zinc-300 truncate ${field.isPrimaryKey ? 'font-bold text-zinc-200' : ''}`}>
                          {field.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-zinc-600">
                          {field.type}
                        </span>
                        {field.referencesTable && (
                          <span className="text-[8px] text-indigo-400 font-bold tracking-tight bg-indigo-500/10 px-1 border border-indigo-500/20 rounded">
                            ➔ {field.referencesTable}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
