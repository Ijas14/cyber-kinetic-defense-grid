#[tokio::main]
async fn main() {
    println!("Bootstrapping Cyber-Kinetic Defense Grid (Web Edition)...");
    ckdg::server::run_server().await;
}
