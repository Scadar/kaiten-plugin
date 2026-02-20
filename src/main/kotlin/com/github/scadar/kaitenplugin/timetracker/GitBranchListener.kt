package com.github.scadar.kaitenplugin.timetracker

import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import git4idea.branch.GitBranchUtil
import git4idea.repo.GitRepository
import git4idea.repo.GitRepositoryChangeListener

class GitBranchListener(private val project: Project) : GitRepositoryChangeListener {
    private val log = logger<GitBranchListener>()
    private val timeTrackingService = TimeTrackingService.getInstance(project)

    override fun repositoryChanged(repository: GitRepository) {
        val currentBranch = repository.currentBranchName ?: return
        val taskId = extractTaskIdFromBranch(currentBranch)

        log.debug("Branch changed to: $currentBranch, extracted taskId: $taskId")

        if (taskId != null) {
            // Check if IDE is in focus before starting tracking
            if (IdeFocusTracker.getInstance(project).isIdeInFocus()) {
                timeTrackingService.startTracking(taskId)
            }
        } else {
            timeTrackingService.stopTracking()
        }
    }

    private fun extractTaskIdFromBranch(branchName: String): Long? {
        // Expected format: task/ktn-{id} or feature/ktn-{id}
        val regex = Regex("""ktn-(\d+)""", RegexOption.IGNORE_CASE)
        val matchResult = regex.find(branchName)
        return matchResult?.groupValues?.get(1)?.toLongOrNull()
    }

    companion object {
        fun getCurrentTaskId(project: Project): Long? {
            val repository = GitBranchUtil.getCurrentRepository(project) ?: return null
            val currentBranch = repository.currentBranchName ?: return null

            val regex = Regex("""ktn-(\d+)""", RegexOption.IGNORE_CASE)
            val matchResult = regex.find(currentBranch)
            return matchResult?.groupValues?.get(1)?.toLongOrNull()
        }
    }
}
