<script setup lang="ts">
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const driverObj = driver({
    showProgress: true,
    steps: [
        {
            element: "#new-transcription-button",
            popover: {
                title: "Welcome to Transcribo!",
                description: "Let's take a quick tour to get you started.",
                position: "bottom",
                alignment: "center",
            },
        },
    ],
});

onMounted(() => {
    const onboardingCompleted = localStorage.getItem("onboardingCompleted");
    if (!onboardingCompleted) {
        driverObj.drive();
        localStorage.setItem("onboardingCompleted", "true");
    }
});
</script>

<template></template>
