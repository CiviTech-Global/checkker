allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

// Force all subprojects to use the same AGP version to avoid classpath conflicts
// from plugins that hardcode different AGP versions in their buildscript blocks.
subprojects {
    project.buildscript.configurations.configureEach {
        resolutionStrategy {
            force("com.android.tools.build:gradle:8.9.1")
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
