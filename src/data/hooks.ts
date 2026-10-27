import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { repo } from './repo'
import type { FormElement, Project } from './types'

/** Every project when `all` (user management), otherwise only those the user may open (assigned, or MasterAdmin). */
export function useProjects({ all = false }: { all?: boolean } = {}) {
  const { user, canAccessProject } = useAuth()
  const [projects, setProjects] = useState<Project[] | undefined>()
  const [error, setError] = useState<string>()
  useEffect(() => {
    if (!user) return
    return repo.watchProjects(setProjects, (e) => setError(e.message))
  }, [user])
  const visible = all ? projects : projects?.filter((p) => canAccessProject(p.id))
  return { projects: visible, loading: projects === undefined && !error, error }
}

export function useProject(id: string | undefined) {
  const [project, setProject] = useState<Project | null | undefined>()
  useEffect(() => {
    if (!id) return
    return repo.watchProject(id, setProject)
  }, [id])
  return project
}

export function useElements(projectId: string | undefined) {
  const [elements, setElements] = useState<FormElement[] | undefined>()
  useEffect(() => {
    if (!projectId) return
    return repo.watchElements(projectId, setElements)
  }, [projectId])
  return elements
}
