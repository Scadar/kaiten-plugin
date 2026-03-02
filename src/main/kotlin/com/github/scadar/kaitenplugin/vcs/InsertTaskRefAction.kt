package com.github.scadar.kaitenplugin.vcs

import com.github.scadar.kaitenplugin.api.KaitenApiClient
import com.github.scadar.kaitenplugin.infrastructure.HttpClientProvider
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.Task
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.vcs.VcsDataKeys
import kotlinx.coroutines.runBlocking

class InsertTaskRefAction : AnAction() {

    private val log = logger<InsertTaskRefAction>()

    override fun getActionUpdateThread() = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        val project = e.project
        val doc     = e.getData(VcsDataKeys.COMMIT_MESSAGE_DOCUMENT)
        if (project == null || doc == null) {
            e.presentation.isEnabled = false
            return
        }
        val settings = KaitenSettingsState.getInstance()
        val taskId   = BranchTaskExtractor.extractTaskId(project, settings.branchPatterns)
        e.presentation.isEnabled = taskId != null
        e.presentation.description = if (taskId != null)
            "Insert Kaiten task reference (KTN-$taskId)"
        else
            "No Kaiten task found in current branch"
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project  = e.project ?: return
        val doc      = e.getData(VcsDataKeys.COMMIT_MESSAGE_DOCUMENT) ?: return
        val settings = KaitenSettingsState.getInstance()
        val taskId   = BranchTaskExtractor.extractTaskId(project, settings.branchPatterns) ?: return

        ProgressManager.getInstance().run(object : Task.Backgroundable(project, "Fetching Kaiten card info…", false) {
            private var cardTitle: String? = null

            override fun run(indicator: ProgressIndicator) {
                val token = settings.apiToken
                val url   = settings.serverUrl
                if (token.isNotBlank() && url.isNotBlank()) {
                    try {
                        cardTitle = runBlocking {
                            KaitenApiClient(HttpClientProvider(token).createClient(), url)
                                .getCard(taskId)?.title
                        }
                    } catch (ex: Exception) {
                        log.warn("Failed to fetch card title for task $taskId", ex)
                    }
                }
            }

            override fun onSuccess() {
                val message = BranchTaskExtractor.buildCommitMessage(
                    settings.commitMessageTemplate, taskId, cardTitle
                )
                WriteCommandAction.runWriteCommandAction(project) {
                    doc.replaceString(0, doc.textLength, message)
                }
            }
        })
    }
}
