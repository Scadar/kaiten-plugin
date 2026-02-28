import org.gradle.api.tasks.bundling.Zip
import org.jetbrains.changelog.Changelog
import org.jetbrains.changelog.markdownToHTML
import org.jetbrains.intellij.platform.gradle.TestFrameworkType
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

plugins {
    id("java") // Java support
    alias(libs.plugins.kotlin) // Kotlin support
    alias(libs.plugins.intelliJPlatform) // IntelliJ Platform Gradle Plugin
    alias(libs.plugins.changelog) // Gradle Changelog Plugin
    alias(libs.plugins.kover) // Gradle Kover Plugin
}

group = providers.gradleProperty("pluginGroup").get()
version = providers.gradleProperty("pluginVersion").get()

// Set the JVM language level used to build the project.
kotlin {
    jvmToolchain(21)
}

// Configure project's dependencies
repositories {
    mavenCentral()

    // IntelliJ Platform Gradle Plugin Repositories Extension - read more: https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-repositories-extension.html
    intellijPlatform {
        defaultRepositories()
    }
}

// Dependencies are managed with Gradle version catalog - read more: https://docs.gradle.org/current/userguide/version_catalogs.html
dependencies {
    testImplementation(libs.junit)
    testImplementation(libs.opentest4j)

    // HTTP Client
    implementation("com.squareup.okhttp3:okhttp:5.3.2")
    implementation("com.squareup.okhttp3:logging-interceptor:5.3.2")

    // JSON Serialization
    implementation("com.google.code.gson:gson:2.13.2")

    // IntelliJ Platform Gradle Plugin Dependencies Extension - read more: https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-dependencies-extension.html
    intellijPlatform {
        intellijIdea(providers.gradleProperty("platformVersion"))

        // Plugin Dependencies. Uses `platformBundledPlugins` property from the gradle.properties file for bundled IntelliJ Platform plugins.
        bundledPlugins(providers.gradleProperty("platformBundledPlugins").map { it.split(',') })

        // Plugin Dependencies. Uses `platformPlugins` property from the gradle.properties file for plugin from JetBrains Marketplace.
        plugins(providers.gradleProperty("platformPlugins").map { it.split(',').filter(String::isNotBlank) })

        // Module Dependencies. Uses `platformBundledModules` property from the gradle.properties file for bundled IntelliJ Platform modules.
        bundledModules(providers.gradleProperty("platformBundledModules").map { it.split(',').filter(String::isNotBlank) })

        testFramework(TestFrameworkType.Platform)
    }
}

// Configure IntelliJ Platform Gradle Plugin - read more: https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-extension.html
intellijPlatform {
    pluginConfiguration {
        name = providers.gradleProperty("pluginName")
        version = providers.gradleProperty("pluginVersion")

        // Extract the <!-- Plugin description --> section from README.md and provide for the plugin's manifest
        description = providers.fileContents(layout.projectDirectory.file("README.md")).asText.map {
            val start = "<!-- Plugin description -->"
            val end = "<!-- Plugin description end -->"

            with(it.lines()) {
                if (!containsAll(listOf(start, end))) {
                    throw GradleException("Plugin description section not found in README.md:\n$start ... $end")
                }
                subList(indexOf(start) + 1, indexOf(end)).joinToString("\n").let(::markdownToHTML)
            }
        }

        val changelog = project.changelog // local variable for configuration cache compatibility
        // Get the latest available change notes from the changelog file
        changeNotes = providers.gradleProperty("pluginVersion").map { pluginVersion ->
            with(changelog) {
                renderItem(
                    (getOrNull(pluginVersion) ?: getUnreleased())
                        .withHeader(false)
                        .withEmptySections(false),
                    Changelog.OutputType.HTML,
                )
            }
        }

        ideaVersion {
            sinceBuild = providers.gradleProperty("pluginSinceBuild")
        }
    }

    signing {
        certificateChain = providers.environmentVariable("CERTIFICATE_CHAIN")
        privateKey = providers.environmentVariable("PRIVATE_KEY")
        password = providers.environmentVariable("PRIVATE_KEY_PASSWORD")
    }

    publishing {
        token = providers.environmentVariable("PUBLISH_TOKEN")
        // The pluginVersion is based on the SemVer (https://semver.org) and supports pre-release labels, like 2.1.7-alpha.3
        // Specify pre-release label to publish the plugin in a custom Release Channel automatically. Read more:
        // https://plugins.jetbrains.com/docs/intellij/publishing-plugin.html#specifying-a-release-channel
        channels = providers.gradleProperty("pluginVersion").map { listOf(it.substringAfter('-', "").substringBefore('.').ifEmpty { "default" }) }
    }

    pluginVerification {
        ides {
            recommended()
        }
    }
}

// Configure Gradle Changelog Plugin - read more: https://github.com/JetBrains/gradle-changelog-plugin
changelog {
    groups.empty()
    repositoryUrl = providers.gradleProperty("pluginRepositoryUrl")
    versionPrefix = ""
}

// Configure Gradle Kover Plugin - read more: https://kotlin.github.io/kotlinx-kover/gradle-plugin/#configuration-details
kover {
    reports {
        total {
            xml {
                onCheck = true
            }
        }
    }
}

tasks {
    val platformVersion = providers.gradleProperty("platformVersion")
    val pluginName = providers.gradleProperty("pluginName")
    val isWindows = System.getProperty("os.name").lowercase().contains("windows")

    register<Exec>("buildReactUI") {
        description = "Builds the React UI with npm"
        workingDir(layout.projectDirectory.dir("ui"))
        if (isWindows) {
            commandLine("cmd", "/c", "npm", "run", "build")
        } else {
            commandLine("npm", "run", "build")
        }
        inputs.dir(layout.projectDirectory.dir("ui/src"))
        inputs.file(layout.projectDirectory.file("ui/package.json"))
        inputs.file(layout.projectDirectory.file("ui/vite.config.ts"))
        inputs.file(layout.projectDirectory.file("ui/tsconfig.json"))
        outputs.dir(layout.projectDirectory.dir("ui/dist"))
    }

    register<Copy>("copyUiDist") {
        description = "Copies the React UI build output into the plugin sandbox directory"
        dependsOn("buildReactUI")
        from(layout.projectDirectory.dir("ui/dist"))
        into(layout.buildDirectory.dir(platformVersion.map { "idea-sandbox/IU-$it/plugins/${pluginName.get()}/ui/dist" }))
    }

    named("prepareSandbox") {
        if (!project.hasProperty("dev")) {
            finalizedBy("copyUiDist")
        }
    }

    named<Zip>("buildPlugin") {
        // copyUiDist only fills the sandbox (used by runIde).
        // For the distribution ZIP we must add ui/dist directly, because buildPlugin
        // in IntelliJ Platform Gradle Plugin 2.x archives its own input set and does
        // not pick up files written to the sandbox after prepareSandbox completes.
        dependsOn("buildReactUI")
        from(layout.projectDirectory.dir("ui/dist")) {
            into("ui/dist")
        }
    }

    named("runIde") {
        if (project.hasProperty("dev")) {
            // Dev mode: automatically start/stop the Vite dev server alongside runIde.
            (this as JavaExec).jvmArgs("-Dkaiten.ui.dev=true")

            val uiDir = layout.projectDirectory.dir("ui").asFile
            @Suppress("UnnecessaryVariable") val isWin = isWindows  // required: doFirst{}/doLast{} can't capture tasks{} scope directly

            fun killViteByPidFile() {
                val tmpDir = System.getProperty("java.io.tmpdir")
                val portFile = File(tmpDir, "kaiten-vite-dev.port")
                val pidFile  = File(tmpDir, "kaiten-vite-dev.pid")

                pidFile.takeIf { it.exists() }?.readText()?.trim()?.toLongOrNull()?.let { pid ->
                    try {
                        if (isWin) {
                            ProcessBuilder("taskkill", "/F", "/T", "/PID", pid.toString())
                                .start().waitFor(5, TimeUnit.SECONDS)
                        } else {
                            ProcessBuilder("kill", "-9", pid.toString())
                                .start().waitFor(5, TimeUnit.SECONDS)
                        }
                        println("[Vite] Stopped dev server (PID $pid)")
                    } catch (_: Exception) {}
                    pidFile.delete()
                    portFile.delete()
                }
            }

            doFirst {
                // Kill any leftover Vite process from a previous run that didn't clean up.
                killViteByPidFile()
                Thread.sleep(500) // give OS time to release the port

                val cmd = if (isWin) listOf("cmd", "/c", "npm", "run", "dev") else listOf("npm", "run", "dev")
                val viteProcess = ProcessBuilder(cmd)
                    .directory(uiDir)
                    .redirectErrorStream(true)
                    .start()

                val tmpDir = System.getProperty("java.io.tmpdir")
                File(tmpDir, "kaiten-vite-dev.pid").writeText(viteProcess.pid().toString())

                val portRegex = Regex("""Local:\s+http://[^:]+:(\d+)""")
                val ready = CountDownLatch(1)
                var detectedPort = 5173

                Thread {
                    try {
                        viteProcess.inputStream.bufferedReader().use { reader ->
                            reader.lineSequence().forEach { line ->
                                println("[Vite] $line")
                                if (ready.count != 0L) {
                                    portRegex.find(line)?.groupValues?.get(1)?.toIntOrNull()?.let { port ->
                                        detectedPort = port
                                        File(tmpDir, "kaiten-vite-dev.port").writeText(port.toString())
                                        ready.countDown()
                                    }
                                }
                            }
                        }
                    } catch (_: Exception) {}
                }.also { it.isDaemon = true }.start()

                val started = ready.await(3, TimeUnit.SECONDS)
                println(
                    if (started) "[Vite] Dev server ready on port $detectedPort"
                    else "[Vite] Warning: timed out waiting for Vite, using default port $detectedPort"
                )
            }

            // doLast fires when runIde completes (IDE closed normally).
            // For abnormal termination (Stop button, crash), the PID file
            // cleanup in doFirst handles it on the next run.
            doLast {
                println("[Vite] Shutting down dev server...")
                killViteByPidFile()
            }
        } else {
            dependsOn("buildReactUI")
        }
    }

    wrapper {
        gradleVersion = providers.gradleProperty("gradleVersion").get()
    }

    publishPlugin {
        dependsOn(patchChangelog)
    }
}
