import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { repo } from './repo'
import type { FormAssembly, FormElement, FormPanel, Project } from './types'

/**
 * Projects the user may open: every project with "project.viewAll" (MasterAdmin), otherwise the ones whose `members`
 * hold the user — the query firestore.rules allows — and that are also in their assignedProjects (what the routes check).
 */
export function useProjects() {
  const { user, can, canAccessProject } = useAuth()
  const all = can('project.viewAll')
  const [projects, setProjects] = useState<Project[] | undefined>()
  const [error, setError] = useState<string>()
  const uid = user?.uid
  useEffect(() => {
    if (!uid) return
    return repo.watchProjects({ uid, all }, setProjects, (e) => setError(e.message))
  }, [uid, all])
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

export function usePanels(projectId: string | undefined) {
  const [panels, setPanels] = useState<FormPanel[] | undefined>()
  useEffect(() => {
    if (!projectId) return
    return repo.watchPanels(projectId, setPanels)
  }, [projectId])
  return panels
}

export function useAssemblies(projectId: string | undefined) {
  const [assemblies, setAssemblies] = useState<FormAssembly[] | undefined>()
  useEffect(() => {
    if (!projectId) return
    return repo.watchAssemblies(projectId, setAssemblies)
  }, [projectId])
  return assemblies
}
