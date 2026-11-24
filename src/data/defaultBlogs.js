// defaultBlogs.js - Fallback & Seed Data for Aerospace Technical Journal
export const DEFAULT_BLOGS = [
  {
    id: "fsw-deterministic-rust",
    slug: "deterministic-rust-in-space",
    title: "Deterministic Rust for Hard Real-Time Space Executives",
    category: "Flight Software",
    date: "Oct 18, 2024",
    readTime: "8 min read",
    author: {
      name: "Võ Quang Nhật Nguyên",
      title: "Lead Flight Software Engineer",
      callsign: "NHAT-NGUYEN"
    },
    tags: ["Flight Software", "Rust", "ARM Cortex-M7", "Real-Time", "MPU"],
    summary: "Eliminating runtime panics and unbounded heap allocations in LEO CubeSat flight computers using no_std Rust and MPU-enforced memory spatial isolation.",
    featured: true,
    content: `
## Architectural Overview

Embedded flight software in deep space and Low Earth Orbit (LEO) operates under strict real-time deadlines. A missed telemetry frame or delayed attitude control loop can lead to loss of pointing knowledge, thermal divergence, or safe-mode triggers during critical eclipse passes.

Historically, flight executives have been authored in MISRA C:2012 or restricted subsets of C++. While proven through decades of flight heritage, C remains susceptible to undefined behavior, concurrency race conditions, and spatial memory corruption when running multi-threaded real-time tasks.

In our recent 3U CubeSat constellation, we replaced legacy C subroutines with a deterministic, \`no_std\` Rust flight executive executing on a radiation-tolerant dual-core ARM Cortex-M7 (SAMV71Q21).

### The Zero-Allocation Mandate

Under hard real-time mission profiles, dynamic heap allocators (\`malloc\` / \`free\`) introduce non-deterministic latency through heap fragmentation and garbage collection pauses. Our flight rules enforce a zero-dynamic-allocation policy post-initialization.

\`\`\`rust
#![no_std]
#![no_main]

use cortex_m::asm::nop;
use cortex_m_rt::entry;
use heapless::spsc::Queue;

// Deterministic static lock-free telemetry ring-buffer
const QUEUE_CAPACITY: usize = 64;
static mut TELEMETRY_QUEUE: Queue<TelemetryFrame, QUEUE_CAPACITY> = Queue::new();

#[repr(C, packed)]
pub struct TelemetryFrame {
    pub timestamp_epoch_ms: u64,
    pub quaternion_q0: f32,
    pub quaternion_q1: f32,
    pub quaternion_q2: f32,
    pub quaternion_q3: f32,
    pub solar_bus_voltage_mv: u16,
    pub checksum_crc16: u16,
}
\`\`\`

> **Telemetry Benchmark:**
> Over 1,200 continuous hours of thermal-vacuum testing at -40°C to +85°C, loop jitter across the primary 100Hz ADCS guidance thread remained strictly bounded below 84.2 microseconds.

### MPU Spatial Isolation & Payloads

Scientific payloads (such as hyperspectral cameras or software-defined radios) frequently execute third-party code. By configuring the ARM Memory Protection Unit (MPU) in tandem with Rust's type system, the flight computer guarantees that payload tasks cannot access flight-critical register addresses or ADCS memory blocks:

- **Region 0:** Flash (Read-Only + Execute)
- **Region 1:** Core Flight Executive SRAM (Privileged RW, No-Execute)
- **Region 2:** Payload Shared Memory Pool (Unprivileged RW)
- **Region 3:** Peripheral Registers (Privileged RW)

### Results from LEO Operations

During the initial 90-day commissioning phase in a 550km Sun-Synchronous Orbit (SSO), the flight software achieved a 100% uptime with zero spontaneous reboots, zero watchdog timeouts, and zero unhandled exception vectors.
    `
  },
  {
    id: "orbital-kalman-filtering",
    slug: "kalman-filtering-cubesat-orbit-determination",
    title: "Extended Kalman Filtering for Real-Time Onboard Orbit Determination",
    category: "Orbital Mechanics",
    date: "Sep 04, 2024",
    readTime: "11 min read",
    author: {
      name: "Võ Quang Nhật Nguyên",
      title: "Flight Software & Astrodynamics Lead",
      callsign: "NHAT-NGUYEN"
    },
    tags: ["Orbital Mechanics", "EKF", "Astrodynamics", "ADCS", "Kalman Filter"],
    summary: "Implementing an autonomous 6-DOF Extended Kalman Filter fusing star tracker quaternions, MEMS gyroscopes, and GPS pseudo-ranges during orbital eclipse.",
    featured: false,
    content: `
## The Navigation Challenge in LEO

Precision orbit determination is fundamental for satellites performing optical ground imaging, optical inter-satellite links, and autonomous collision avoidance maneuvers. While GPS receivers deliver sub-meter positioning during line-of-sight passes, multi-path reflections and orbital eclipse events introduce measurement dropouts.

To maintain real-time position knowledge under GPS denial or duty-cycle constraints, modern flight software employs an onboard Extended Kalman Filter (EKF) propagating perturbed two-body orbital dynamics.

### State Vector Definition

The filter state vector $\\mathbf{x} \\in \\mathbb{R}^{10}$ encompasses orbital Cartesian coordinates, velocities, and receiver clock bias drift:

\`\`\`text
x = [ r_x, r_y, r_z, v_x, v_y, v_z, delta_t, delta_dot_t, b_gyro_x, b_gyro_y ]^T
\`\`\`

### Gravitational Perturbations (J2 Geopotential Harmonics)

Due to Earth's oblateness, Keplerian orbits experience nodal regression and argument of perigee rotation. Incorporating the second zonal harmonic ($J_2 = 1.08263 \\times 10^{-3}$) into the propagation model reduces ephemeris drift from kilometers to tens of meters per revolution:

\`\`\`c
void propagate_j2_acceleration(const double r[3], double a[3]) {
    double r_mag = sqrt(r[0]*r[0] + r[1]*r[1] + r[2]*r[2]);
    double r2 = r_mag * r_mag;
    double r5 = r2 * r2 * r_mag;
    double z2 = r[2] * r[2];
    double factor = 1.5 * J2 * MU_EARTH * RE_EARTH * RE_EARTH / r5;

    a[0] = -MU_EARTH * r[0] / (r2 * r_mag) + factor * r[0] * (5.0 * z2 / r2 - 1.0);
    a[1] = -MU_EARTH * r[1] / (r2 * r_mag) + factor * r[1] * (5.0 * z2 / r2 - 1.0);
    a[2] = -MU_EARTH * r[2] / (r2 * r_mag) + factor * r[2] * (5.0 * z2 / r2 - 3.0);
}
\`\`\`

> **Flight Heritage Insight:**
> Real-time propagation with Runge-Kutta Fehlberg 4(5) on an embedded ARM microcontroller completes each 100ms step in 4.3ms, leaving 95% CPU idle capacity for command processing.

### Performance Verification

Monte Carlo simulations over 10,000 perturbed orbital passes demonstrated 3-sigma position accuracy of $\\pm 1.2$ meters during active GPS updates and $<14.5$ meters after 45 minutes of complete GPS signal blackout.
    `
  },
  {
    id: "avionics-fdir-architecture",
    slug: "fault-tolerant-avionics-fdir",
    title: "Hierarchical FDIR: Architecting Zero-Failure Avionics Buses",
    category: "Avionics",
    date: "Jul 22, 2024",
    readTime: "9 min read",
    author: {
      name: "Võ Quang Nhật Nguyên",
      title: "Spacecraft Avionics Architect",
      callsign: "NHAT-NGUYEN"
    },
    tags: ["Avionics", "FDIR", "SpaceWire", "CANopen", "Fault Tolerance"],
    summary: "How automated triple-redundant heartbeat monitoring and SpaceWire/CANopen bus isolation reduced safe-mode anomalies by 64% in orbit.",
    featured: false,
    content: `
## Single-Point Failures vs Autonomous Recovery

Space radiation environments present persistent hazards: Single Event Upsets (SEU), Single Event Latch-ups (SEL), and micro-meteorite strikes. Traditional spacecraft architectures often react to unhandled bus timeouts by dropping immediately into Safe Mode—detumbling the spacecraft, deploying solar panels, and shutting down payload power.

While safe, entering safe mode disrupts mission operations, costs precious contact windows, and places thermal stress on battery cells.

### The 4-Tier Hierarchical FDIR Strategy

To minimize unnecessary safe mode entries, we designed a multi-tiered Fault Detection, Isolation, and Recovery (FDIR) architecture:

1. **Tier 1 (Subsystem Local):** Microsecond bus transaction retry and CRC verification at the hardware peripheral driver.
2. **Tier 2 (Process Level):** RTOS task restart within 20 milliseconds without power cycling the microcontroller.
3. **Tier 3 (Subsystem Power Cycle):** Controlled power latch toggle on avionics switches if heartbeats drop for >3 consecutive beacon periods.
4. **Tier 4 (System Safe Hold):** Coordinated handover to redundant secondary flight computer via cross-strapped CANopen heartbeat bus.

\`\`\`text
+-------------------------------------------------------------+
|                     SYSTEM HEALTH SUPERVISOR                |
+-------------------------------------------------------------+
       |                                              |
 [Heartbeat OK]                                 [Heartbeat Lost]
       v                                              v
+--------------+                               +--------------+
| Continue FSW |                               | Tier 2: Task |
| Nominal Loop |                               | Soft Reset   |
+--------------+                               +--------------+
                                                      |
                                                [Still Failing]
                                                      v
                                               +--------------+
                                               | Tier 3: Bus  |
                                               | Power Cycle  |
                                               +--------------+
                                                      |
                                                [Unresponsive]
                                                      v
                                               +--------------+
                                               | Tier 4: SAFE |
                                               | HOLD BEACON  |
                                               +--------------+
\`\`\`

> **Telemetry Note:**
> In-flight data over 18 months confirmed that 94% of transient anomalies were resolved at Tier 1 or Tier 2, avoiding 14 potential safe-mode downtime events.
    `
  },
  {
    id: "deep-space-optical-downlinks",
    slug: "deep-space-optical-comms-protocols",
    title: "CCSDS-Compliant Optical Downlinks & High-Rate Framers",
    category: "Deep Space Comms",
    date: "May 15, 2024",
    readTime: "12 min read",
    author: {
      name: "Võ Quang Nhật Nguyên",
      title: "Space Telemetry & Comms Architect",
      callsign: "NHAT-NGUYEN"
    },
    tags: ["Deep Space Comms", "CCSDS 133.0", "Laser Comms", "DSP", "Optical Framing"],
    summary: "Transitioning from RF S-band to 1550nm laser optical communications: handling atmospheric jitter, pointing acquisition, and LDPC error correction framing.",
    featured: false,
    content: `
## Overcoming the RF Bandwidth Bottleneck

With high-resolution hyperspectral imagers and synthetic aperture radars generating hundreds of gigabytes per orbit, traditional S-band (2 Mbps) and X-band (150 Mbps) downlinks have reached their physical limits within smallsat volume and power constraints.

Free-space optical (laser) communications operating at 1550nm offer data rates exceeding 10 to 100 Gbps while reducing payload transceiver mass and antenna size.

### Optical Link Budget & Atmospheric Scintillation

Unlike radio waves, 1550nm photons suffer severe phase distortion and intensity scintillation when propagating through turbulent atmospheric layers in the troposphere. To prevent frame loss, the downlink protocol incorporates high-rate Low-Density Parity-Check (LDPC) forward error correction specified by CCSDS 131.0-B-3.

\`\`\`text
Downlink Parameter         RF S-Band            Optical 1550nm
------------------------------------------------------------------
Carrier Frequency          2.2 GHz              193.4 THz
Raw Bitrate                2.5 Mbps             10.0 Gbps
Transmitter Mass           1.4 kg               0.85 kg
DC Power Draw              28 W                 18 W
Pointing Accuracy Req.     ± 2.5°               ± 0.004° (Micro-radians)
\`\`\`

### High-Rate Packet Framing Engine

To ingest data at 10 Gbps without packet loss, the framing engine utilizes an FPGA-based direct memory access (DMA) architecture streaming CCSDS Transfer Frames into dual optical modulators.

\`\`\`c
// CCSDS 131.2-B High Rate Optical Framer Header
typedef struct __attribute__((packed)) {
    uint16_t scid_vcid;        // Spacecraft ID (10 bits) + Virtual Channel (6 bits)
    uint24_t master_frame_cnt; // Master Channel Frame Count
    uint24_t vc_frame_cnt;     // Virtual Channel Frame Count
    uint16_t frame_status;     // Slicing and Sync Flags
    uint8_t  payload_data[1024]; // High-Rate Science Telemetry
    uint32_t reed_solomon_crc;  // Outer Parity Check
} CcsdsOpticalTransferFrame;
\`\`\`

> **Flight Telemetry Summary:**
> During joint tests with ground optical receivers in Haleakalā, Hawaii, the transceiver established closed-loop tracking in under 18 seconds and downlinked 48 Gigabytes of raw mission data in a single 6-minute zenith pass.
    `
  }
];
