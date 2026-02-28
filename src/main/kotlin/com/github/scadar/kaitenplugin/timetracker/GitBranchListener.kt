package com.github.scadar.kaitenplugin.timetracker

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import git4idea.repo.GitRepository
import git4idea.repo.GitRepositoryChangeListener
import git4idea.repo.GitRepositoryManager

class GitBranchListener(private val project: Project) : GitRepositoryChangeListener {
    private val log = logger<GitBranchListener>()
    private val timeTrackingService = TimeTrackingService.getInstance(project)
    private val branchTimeTrackingService = BranchTimeTrackingService.getInstance(project)

    override fun repositoryChanged(repository: GitRepository) {
        val currentBranch = repository.currentBranchName ?: return
        val taskId = extractTaskIdFromBranch(currentBranch)

        log.debug("Branch changed to: $currentBranch, extracted taskId: $taskId")

        // Task-level tracking (Kaiten time entries)
        if (taskId != null) {
            if (IdeFocusTracker.getInstance(project).isIdeInFocus()) {
                timeTrackingService.startTracking(taskId)
            }
        } else {
            timeTrackingService.stopTracking()
        }

        // Branch-level tracking — always track the active branch when IDE is focused
        if (IdeFocusTracker.getInstance(project).isIdeInFocus()) {
            branchTimeTrackingService.startTracking(currentBranch)
        } else {
            branchTimeTrackingService.stopTracking()
        }
    }

    companion object {
        private val TASK_ID_REGEX = Regex("""ktn-(\d+)""", RegexOption.IGNORE_CASE)

        fun extractTaskIdFromBranch(branchName: String): Long? =
            TASK_ID_REGEX.find(branchName)?.groupValues?.get(1)?.toLongOrNull()

        fun getCurrentTaskId(project: Project): Long? {
            val branch = GitRepositoryManager.getInstance(project).repositories.firstOrNull()?.currentBranchName ?: return null
            return extractTaskIdFromBranch(branch)
        }

        fun getCurrentBranchName(project: Project): String? =
            GitRepositoryManager.getInstance(project).repositories.firstOrNull()?.currentBranchName
    }
}
